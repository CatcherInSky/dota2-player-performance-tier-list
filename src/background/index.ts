import { db } from './db.ts'
import type { CommentFilters, MatchFilters, PlayerFilters } from '../shared/types/api'
import type { ExportedDatabase, MatchRecord, SettingsRecord } from '../shared/types/database'
import type { BackgroundApi, BackgroundApiEvents } from '../shared/types/api'
import type { GlobalMatchData } from '../shared/types/dota2'
import { backgroundEventBus } from './event-bus'
import { MatchesRepository } from './repositories/matches.ts'
import { PlayersRepository } from './repositories/players.ts'
import { CommentsRepository } from './repositories/comments.ts'
import { MatchTracker } from './lifecycle.ts'
import { SettingsRepository } from './repositories/settings.ts'
import { WindowManager } from './window.ts'
import { HotkeyManager } from './hotkey.ts'
import { Logger } from '../shared/utils/logger'
import type { BackgroundEvents } from './event-bus'

type SaveCommentPayload = {
  matchId: string
  playerId: string
  score: number
  comment: string
}

/**
 * BackgroundApp - 后台应用主类
 * 负责应用初始化、游戏事件监听、数据同步和窗口管理
 */
export class BackgroundApp {
  private logger = new Logger({ namespace: 'BackgroundApp' })
  private windowManager = new WindowManager()
  private matchesRepository = new MatchesRepository()
  private playersRepository = new PlayersRepository()
  private commentsRepository = new CommentsRepository()
  private settingsRepository = new SettingsRepository()
  private matchTracker = new MatchTracker()
  private currentMatch: MatchRecord | null = null
  private initialized = false  
  private listenersRegistered = false
  private settings: SettingsRecord | null = null
  private hotkeyManager = new HotkeyManager(this.windowManager)

  /**
   * 初始化后台应用
   * - 加载设置配置
   * - 注册游戏启动监控
   * - 注册热键管理器
   * - 创建并暴露BackgroundApi
   * - 显示desktop窗口
   */
  async init() {
    if (this.initialized) return
    this.initialized = true

    this.settings = await this.settingsRepository.get()
    backgroundEventBus.emit('settings:updated', this.settings)

    this.monitorGameLaunch()
    // this.registerGameListeners()
    this.hotkeyManager.register()
    ;(window as Window & { backgroundApi?: BackgroundApi }).backgroundApi = this.createApi()
    this.logger.info('Background application initialized')

    await this.windowManager.show('desktop')

  }

  /**
   * 创建并返回BackgroundApi实例
   * BackgroundApi提供了窗口管理、数据访问、设置管理等接口供前端调用
   */
  private createApi(): BackgroundApi {
    const api: BackgroundApi = {
      windows: {
        showDesktop: () => this.windowManager.show('desktop'),
        hideDesktop: () => this.windowManager.hide('desktop'),
        toggleDesktop: () => this.windowManager.toggleDesktop(),
        showHistory: () => this.windowManager.showHistory(),
        hideHistory: () => this.windowManager.hide('history'),
        dragHistory: () => this.windowManager.dragMove('history'),
        showComment: () => this.windowManager.showComment(),
        hideComment: () => this.windowManager.hide('comment'),
        dragComment: () => this.windowManager.dragMove('comment'),
      },
      data: {
        getMatches: (filters?: MatchFilters) => this.matchesRepository.query(filters),
        getPlayers: (filters?: PlayerFilters) => this.playersRepository.query(filters),
        getComments: (filters?: CommentFilters) => this.commentsRepository.query(filters),
        getPlayerHistory: (playerId: string) => this.playersRepository.getHistory(playerId),
        saveComment: (payload: SaveCommentPayload) => this.commentsRepository.save(payload),
      },
      match: {
        getCurrent: async () => ({
          state: this.matchTracker.getState(),
          match: this.currentMatch,
        }),
      },
      settings: {
        get: async () => {
          this.settings = await this.settingsRepository.get()
          return this.settings
        },
        update: async (payload: Partial<SettingsRecord>) => {
          this.settings = await this.settingsRepository.update(payload)
          backgroundEventBus.emit('settings:updated', this.settings)
          return this.settings
        },
        export: () => db.export(),
        import: async (payload: ExportedDatabase) => {
          await db.import(payload)
          this.logger.info('Database imported', payload)
        },
        importMatch: async (matchData: GlobalMatchData) => {
          // 创建或更新比赛记录
          const match = await this.matchesRepository.finalizeFromState(matchData)
          
          // 同步玩家数据（syncFromMatch会遍历所有玩家）
          await this.playersRepository.syncFromMatch(matchData)
          
          // 创建评论占位符
          if (matchData.roster.players) {
            await this.commentsRepository.ensurePlaceholders(match.matchId, matchData.roster.players)
          }
          
          this.logger.info('Match imported', match.matchId)
          backgroundEventBus.emit('match:end', undefined)
          return match
        },
        clear: async () => {
          await db.clearAll()
          this.matchTracker.reset()
          this.currentMatch = null
          this.settings = await this.settingsRepository.reset()
          backgroundEventBus.emit('settings:updated', this.settings)
        },
      },
      events: {
        on: <EventKey extends keyof BackgroundApiEvents & keyof BackgroundEvents>(
          event: EventKey,
          listener: (payload: BackgroundApiEvents[EventKey]) => void,
        ) => backgroundEventBus.on(event, listener as (payload: BackgroundEvents[EventKey]) => void),
      },
    }
    return api
  }

  /**
   * 注册游戏事件监听器
   * - 监听 onInfoUpdates2 事件（match_info, me, roster等持续更新）
   * - 监听 onNewEvents 事件（match_state_changed, game_state_changed等状态变化）
   * - 设置所需的GEP特性（match_info, match_state_changed等）
   * - 如果设置失败，2秒后重试
   */
  private registerGameListeners() {
    if (this.listenersRegistered) return;
    this.logger.info('Dota 2 launched; enabling listeners')
    overwolf?.games?.events?.onInfoUpdates2?.addListener(this.handleInfoUpdate)
    overwolf?.games?.events?.onNewEvents?.addListener(this.handleNewEvents)

    overwolf?.games?.events?.setRequiredFeatures([
      'match_info',
      'match_state_changed',
      'game_state_changed',
      'roster',
      'me',
      'match_ended',
      'gep_internal',
      'game',
      'match'
    ], (result) => {
      const info = (result ?? {}) as {
        status?: string
        success?: boolean
        error?: string
      }
      const successFlag = typeof info.success === 'boolean' ? info.success : undefined
      const statusFlag = typeof info.status === 'string' ? info.status !== 'error' : undefined
      const isSuccess = successFlag ?? statusFlag ?? !info.error

      if (!isSuccess) {
        this.logger.warn('setRequiredFeatures failed, retrying', info)
        setTimeout(() => this.registerGameListeners(), 2000)
      } else {
        this.logger.info('Game events features enabled')
      }
    })
    this.listenersRegistered = true
    
  }

  /**
   * 处理 onInfoUpdates2 事件
   * 持续更新的游戏信息（match_info, me, roster等）会被传递给MatchTracker处理
   */
  private handleInfoUpdate = (event: { feature: string; info: unknown }) => {
    this.logger.debug('onInfoUpdates2', event)
    this.matchTracker.handleInfoUpdate(event as any)
  }

  /**
   * 处理 onNewEvents 事件
   * - 将事件传递给MatchTracker处理
   * - 根据返回的信号（start/end）执行相应操作：
   *   - start: 创建/更新比赛记录，同步玩家数据，显示history窗口
   *   - end: 最终化比赛记录，同步玩家数据，创建评价占位符，隐藏history窗口，显示comment窗口
   */
  private handleNewEvents = async (event: { events: Array<{ name: string; data: string }> }) => {
    this.logger.debug('onNewEvents', event)
    const signal = this.matchTracker.handleNewEvents(event as any)
    const state = this.matchTracker.getState()

    if (signal === 'start') {
      try {
        const match = await this.matchesRepository.createOrUpdateFromState(state, { allowCreate: true })
        this.currentMatch = match
        await this.playersRepository.syncFromMatch(state)
        backgroundEventBus.emit('match:start')
        await this.windowManager.showHistory()
      } catch (error) {
        this.logger.error('Failed to process match start', error)
      }
    } else if (signal === 'end') {
      try {
        const match = await this.matchesRepository.finalizeFromState(state)
        this.currentMatch = match
        const matchId = match?.matchId ?? this.matchTracker.getMatchId()
        await this.playersRepository.syncFromMatch(state)
        if (matchId) {
          await this.commentsRepository.ensurePlaceholders(matchId, state.roster.players)
        }
        backgroundEventBus.emit('match:end')
        await this.windowManager.hideHistory()
        await this.windowManager.showComment()
        this.matchTracker.reset()
      } catch (error) {
        this.logger.error('Failed to process match end', error)
      }
    }
  }

  /**
   * 监控Dota2游戏启动/关闭状态
   * - 监听 overwolf.games.onGameInfoUpdated 事件
   * - 游戏启动时注册游戏监听器
   * - 游戏关闭时清理游戏监听器并重置MatchTracker状态
   */
  private monitorGameLaunch() {
    overwolf?.games?.onGameInfoUpdated?.addListener((change) => {
      const launched = this.isDota2Launched(change)
      if (launched) {
        this.registerGameListeners()
      } else {
        this.cleanupGameListeners()

      }
    })
  }

  /**
   * 清理游戏事件监听器
   * - 移除 onInfoUpdates2 和 onNewEvents 监听器
   * - 重置MatchTracker状态
   * - 将listenersRegistered标志设为false
   */
  private cleanupGameListeners() {
    this.logger.info('Dota 2 terminated; clearing listeners')
    overwolf?.games?.events?.onInfoUpdates2?.removeListener?.(this.handleInfoUpdate)
    overwolf?.games?.events?.onNewEvents?.removeListener?.(this.handleNewEvents)
    this.matchTracker.reset()
    this.listenersRegistered = false
  }

  /**
   * 判断Dota2是否已启动
   * Dota2的游戏ID为7314（通过 Math.floor(id / 10) === 7314 判断）
   * @returns true表示Dota2正在运行，false表示未运行
   */
  private isDota2Launched(gameInfo: overwolf.games.GameInfoUpdatedEvent) {
    if (!gameInfo.gameInfo) return false
    if (!gameInfo.gameInfo.isRunning) return false
    const id = gameInfo.gameInfo.id
    if (typeof id !== 'number') return false
    return Math.floor(id / 10) === 7314
  }
}


const app = new BackgroundApp()
app.init()