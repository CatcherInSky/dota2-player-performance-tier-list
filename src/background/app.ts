import { db } from '../shared/db'
import type { CommentFilters, MatchFilters, PlayerFilters } from '../shared/types/api'
import type { ExportedDatabase, MatchRecord, SettingsRecord } from '../shared/types/database'
import type { BackgroundApi } from '../shared/api/background'
import { backgroundEventBus } from './event-bus'
import { DataService } from './data-service'
import { MatchTracker } from './match-tracker'
import { SettingsService } from './settings-service'
import { WindowManager } from './window-manager'
import { Logger } from '../shared/utils/logger'
import { getOverwolf, isOverwolfAvailable } from '../shared/utils/overwolf'

const REQUESTED_FEATURES = [
  'match_info',
  'match_state',
  'match_state_changed',
  'game_state',
  'game_state_changed',
  'roster',
  'me',
  'match_outcome',
  'match_ended',
  'game_over',
]

export class BackgroundApp {
  private logger = new Logger({ namespace: 'BackgroundApp' })
  private overwolf = getOverwolf()
  private windowManager = new WindowManager()
  private dataService = new DataService()
  private settingsService = new SettingsService()
  private matchTracker = new MatchTracker()
  private currentMatch: MatchRecord | null = null
  private initialized = false
  private settings: SettingsRecord | null = null
  private infoUpdateHandler = (event: overwolf.games.events.InfoUpdates2Event) => {
    this.logger.debug('onInfoUpdates2', event)
    this.handleInfoUpdate(event as any)
  }
  private newEventsHandler = (event: overwolf.games.events.NewGameEvents) => {
    this.logger.debug('onNewEvents', event)
    this.handleNewEvents(event as any)
  }

  async init() {
    if (this.initialized) return
    this.initialized = true

    this.settings = await this.settingsService.getSettings()
    backgroundEventBus.emit('settings:updated', this.settings)

    if (isOverwolfAvailable()) {
      this.registerGameListeners()
      this.monitorGameLaunch()
      this.registerHotkeys()
    } else {
      this.logger.warn('Overwolf API not available; running in development mode.')
    }

    window.backgroundApi = this.createApi()
    this.logger.info('Background application initialized')
  }

  private createApi(): BackgroundApi {
    return {
      windows: {
        showDesktop: () => this.windowManager.show('desktop'),
        hideDesktop: () => this.windowManager.hide('desktop'),
        toggleDesktop: () => this.windowManager.toggleDesktop(),
        showIngame: (data?: unknown) => this.windowManager.showIngame(data),
        hideIngame: () => this.windowManager.hide('ingame'),
        dragIngame: () => this.windowManager.dragMove('ingame'),
      },
      data: {
        getMatches: (filters?: MatchFilters) => this.dataService.getMatches(filters),
        getPlayers: (filters?: PlayerFilters) => this.dataService.getPlayers(filters),
        getComments: (filters?: CommentFilters) => this.dataService.getComments(filters),
        getPlayerHistory: (playerId: string) => this.dataService.getPlayerHistory(playerId),
        saveComment: (payload) => this.dataService.saveComment(payload),
      },
      match: {
        getCurrent: async () => ({
          state: this.matchTracker.getState(),
          match: this.currentMatch,
        }),
      },
      settings: {
        get: async () => {
          this.settings = await this.settingsService.getSettings()
          return this.settings
        },
        update: async (payload: Partial<SettingsRecord>) => {
          this.settings = await this.settingsService.updateSettings(payload)
          backgroundEventBus.emit('settings:updated', this.settings)
          return this.settings
        },
        export: () => db.export(),
        import: async (payload: ExportedDatabase) => {
          await db.import(payload)
          this.logger.info('Database imported', payload)
        },
        clear: async () => {
          await db.clearAll()
          this.matchTracker.reset()
          this.currentMatch = null
          this.settings = await this.settingsService.resetToDefaults()
          backgroundEventBus.emit('settings:updated', this.settings)
        },
      },
      events: {
        on: (event, listener) => backgroundEventBus.on(event, listener as any),
      },
    }
  }

  private listenersRegistered = false

  private registerGameListeners() {
    if (!this.listenersRegistered) {
      this.overwolf?.games?.events?.onInfoUpdates2?.addListener(this.infoUpdateHandler)
      this.overwolf?.games?.events?.onNewEvents?.addListener(this.newEventsHandler)
      this.listenersRegistered = true
    }

    this.overwolf?.games?.events?.setRequiredFeatures(REQUESTED_FEATURES, (result) => {
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
  }

  private handleInfoUpdate(event: { feature: string; info: unknown }) {
    this.matchTracker.handleInfoUpdate(event as any)
    const state = this.matchTracker.getState()
    void this.dataService.ensureMatchRecord(state).then((match: MatchRecord | null) => {
      this.currentMatch = match
      backgroundEventBus.emit('match:update', { match, state })
    })
  }

  private handleNewEvents(event: { events: Array<{ name: string; data: string }> }) {
    const signal = this.matchTracker.handleNewEvents(event as any)
    const state = this.matchTracker.getState()

    if (signal === 'start') {
      const fallbackId = `match-${Date.now()}`
      this.matchTracker.upsertMatchId(fallbackId)

      void this.dataService.ensureMatchRecord(state).then(async (match: MatchRecord | null) => {
        this.currentMatch = match
        await this.dataService.syncPlayers(state)
        backgroundEventBus.emit('match:start', { match, state })
        await this.windowManager.showIngame({ mode: 'history', state, match })
      })
    } else if (signal === 'end') {
      void this.dataService.finalizeMatch(state).then(async (match: MatchRecord | null) => {
        this.currentMatch = match
        const matchId = match?.matchId ?? this.matchTracker.getMatchId()
        await this.dataService.syncPlayers(state)
        if (matchId) {
          await this.dataService.ensureCommentPlaceholders(matchId, state.roster.players)
        }
        backgroundEventBus.emit('match:end', { match, state })
        await this.windowManager.showIngame({ mode: 'editor', state, match })
        this.matchTracker.reset()
      })
    } else {
      void this.dataService.ensureMatchRecord(state).then((match: MatchRecord | null) => {
        this.currentMatch = match
        backgroundEventBus.emit('match:update', { match, state })
      })
    }
  }

  private monitorGameLaunch() {
    this.overwolf?.games?.onGameInfoUpdated?.addListener((change) => {
      const launched = this.isDota2Launched(change)
      const terminated = this.isDota2Terminated(change)
      if (launched) {
        this.logger.info('Dota 2 launched; enabling listeners')
        this.registerGameListeners()
      }
      if (terminated) {
        this.logger.info('Dota 2 terminated; clearing listeners')
        this.cleanupGameListeners()
      }
    })
  }

  private registerHotkeys() {
    this.overwolf?.settings?.hotkeys?.onPressed?.addListener((event) => {
      if (event.name === 'toggle_windows') {
        void this.windowManager.toggleDesktop()
      }
      if (event.name === 'toggle_ingame') {
        void this.windowManager.toggle('ingame')
      }
    })
  }

  private cleanupGameListeners() {
    this.overwolf?.games?.events?.onInfoUpdates2?.removeListener?.(this.infoUpdateHandler)
    this.overwolf?.games?.events?.onNewEvents?.removeListener?.(this.newEventsHandler)
    this.matchTracker.reset()
    this.listenersRegistered = false
  }

  private isDota2Launched(gameInfo: overwolf.games.GameInfoUpdatedEvent) {
    if (!gameInfo.gameInfo || !gameInfo.runningChanged) return false
    if (!gameInfo.gameInfo.isRunning) return false
    const id = gameInfo.gameInfo.id
    if (typeof id !== 'number') return false
    return Math.floor(id / 10) === 7314
  }

  private isDota2Terminated(gameInfo: overwolf.games.GameInfoUpdatedEvent) {
    if (!gameInfo.gameInfo || !gameInfo.runningChanged) return false
    if (gameInfo.gameInfo.isRunning) return false
    const id = gameInfo.gameInfo.id
    if (typeof id !== 'number') return false
    return Math.floor(id / 10) === 7314
  }
}

