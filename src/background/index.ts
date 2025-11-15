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

  private handleInfoUpdate = (event: { feature: string; info: unknown }) => {
    this.logger.debug('onInfoUpdates2', event)
    this.matchTracker.handleInfoUpdate(event as any)
  }

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

  private cleanupGameListeners() {
    this.logger.info('Dota 2 terminated; clearing listeners')
    overwolf?.games?.events?.onInfoUpdates2?.removeListener?.(this.handleInfoUpdate)
    overwolf?.games?.events?.onNewEvents?.removeListener?.(this.handleNewEvents)
    this.matchTracker.reset()
    this.listenersRegistered = false
  }

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