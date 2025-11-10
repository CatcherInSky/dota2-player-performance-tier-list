import {
  Dota2EventPayload,
  Dota2GameState,
  Dota2InfoUpdates,
  Dota2MatchState,
  Dota2Player,
  Dota2RosterPayload,
  Dota2Team,
  Dota2TeamId,
  Dota2TeamKey,
  GameModeInfo,
  GlobalMatchData,
  MatchInfo,
  TeamScore,
} from '../shared/types/dota2'
import { safeJsonParse } from '../shared/utils/json'
import { Logger } from '../shared/utils/logger'

type DotaInfoUpdate =
  | Dota2InfoUpdates<'match_info', MatchInfo>
  | Dota2InfoUpdates<'me', { me?: GlobalMatchData['me'] }>
  | Dota2InfoUpdates<'roster', Dota2RosterPayload>
  | Dota2InfoUpdates<'match_state_changed', { game?: { match_state?: Dota2MatchState } }>
  | Dota2InfoUpdates<'game_state_changed', { game?: { game_state?: Dota2GameState } }>

export type MatchSignal = 'start' | 'end'

const MATCH_START_STATES: Dota2MatchState[] = [
  Dota2MatchState.STRATEGY_TIME,
  Dota2MatchState.GAME_IN_PROGRESS,
]

const MATCH_END_EVENTS = new Set(['game_over', 'match_ended'])

const TEAM_ID_TO_KEY: Record<number, Dota2TeamKey> = {
  [Dota2TeamId.NONE]: Dota2Team.NONE,
  [Dota2TeamId.RADIANT]: Dota2Team.RADIANT,
  [Dota2TeamId.DIRE]: Dota2Team.DIRE,
}

export class MatchTracker {
  private logger = new Logger({ namespace: 'MatchTracker' })
  private state: GlobalMatchData = this.createEmptyState()
  private active = false
  private matchId: string | undefined

  reset() {
    this.logger.info('Reset match tracker state')
    this.state = this.createEmptyState()
    this.active = false
    this.matchId = undefined
  }

  getState(): GlobalMatchData {
    return JSON.parse(JSON.stringify(this.state)) as GlobalMatchData
  }

  getMatchId(): string | undefined {
    return this.matchId ?? this.state.match_info.pseudo_match_id
  }

  upsertMatchId(fallback: string) {
    if (!this.state.match_info.pseudo_match_id) {
      this.state.match_info.pseudo_match_id = fallback
    }
    this.matchId = this.state.match_info.pseudo_match_id
  }

  handleInfoUpdate(update: DotaInfoUpdate) {
    switch (update.feature) {
      case 'match_info': {
        const { match_info } = update.info
        if (!match_info) break
        if (match_info.pseudo_match_id) {
          this.state.match_info.pseudo_match_id = match_info.pseudo_match_id
        }
        if (match_info.game_mode) {
          const parsed = safeJsonParse<GameModeInfo>(match_info.game_mode)
          if (parsed) {
            this.state.match_info.game_mode = parsed
          }
        }
        if (match_info.team_score) {
          const parsed = safeJsonParse<TeamScore>(match_info.team_score)
          if (parsed) {
            this.state.match_info.team_score = parsed
          }
        }
        break
      }
      case 'me': {
        const { me } = update.info
        if (me?.steam_id) {
          this.state.me.steam_id = me.steam_id
        }
        if (me?.team) {
          this.state.me.team = me.team
        }
        break
      }
      case 'roster': {
        const playersJson = update.info.roster?.players
        const players = safeJsonParse<Dota2Player[]>(playersJson ?? '')
        if (players) {
          this.state.roster.players = players.map((player) => {
            const rawTeam = player.team
            let team: Dota2Player['team'] = rawTeam
            if (typeof rawTeam === 'number') {
              team = TEAM_ID_TO_KEY[rawTeam] ?? Dota2Team.NONE
            }
            return {
              ...player,
              team,
            }
          })
        }
        break
      }
      case 'match_state_changed': {
        const matchState = update.info.game?.match_state
        if (matchState) {
          this.state.game.match_state = matchState
        }
        break
      }
      case 'game_state_changed': {
        const gameState = update.info.game?.game_state
        if (gameState) {
          this.state.game.game_state = gameState
        }
        break
      }
      default:
        break
    }
  }

  handleNewEvents(payload: Dota2EventPayload): MatchSignal | undefined {
    let signal: MatchSignal | undefined

    payload.events.forEach((event) => {
      const data = safeJsonParse<Record<string, unknown>>(event.data)
      if (!data && event.name !== 'game_over') {
        return
      }

      if (event.name === 'match_state_changed') {
        const payload = data as {
          match_state?: Dota2MatchState
          game_state?: Dota2MatchState
        }
        const matchState = payload?.match_state ?? payload?.game_state
        if (matchState) {
          this.state.game.match_state = matchState
          if (!this.active && MATCH_START_STATES.includes(matchState)) {
            this.active = true
            signal = 'start'
          }
        }
      }

      if (event.name === 'game_state_changed') {
        const payload = data as {
          game_state?: Dota2GameState
          game?: { game_state?: Dota2GameState }
        }
        const gameState = payload?.game_state ?? payload?.game?.game_state
        if (gameState) {
          this.state.game.game_state = gameState
        }
      }

      if (event.name === 'match_ended' || event.name === 'match_outcome') {
        const payload = data as {
          winner?: Dota2TeamKey
          match_outcome?: Dota2TeamKey
        }
        const winner = payload?.winner ?? payload?.match_outcome
        if (winner && Object.values(Dota2Team).includes(winner as Dota2Team)) {
          this.state.game.winner = winner
        }
        signal = 'end'
      }

      if (event.name === 'game_over') {
        signal = 'end'
      }
    })

    return signal
  }

  shouldEnd(events: Dota2EventPayload): boolean {
    return events.events.some((event) => MATCH_END_EVENTS.has(event.name))
  }

  private createEmptyState(): GlobalMatchData {
    return {
      match_info: {},
      me: {},
      roster: {},
      game: {},
    }
  }
}

