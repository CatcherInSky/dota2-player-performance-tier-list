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
import { filterRosterPlayers } from '../shared/utils/roster'

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

/**
 * MatchTracker - 比赛状态跟踪器
 * 维护全局比赛数据（GlobalMatchData），监听游戏事件并更新状态
 * 检测比赛起点信号（match_state进入策略时间或游戏进行中）和终点信号（game_over/match_ended）
 */
export class MatchTracker {
  private logger = new Logger({ namespace: 'MatchTracker' })
  private state: GlobalMatchData = this.createEmptyState()
  private active = false
  private matchId: string | undefined

  /**
   * 重置MatchTracker状态
   * 清空所有比赛数据，重置active标志，用于比赛结束或游戏关闭时
   */
  reset() {
    this.logger.info('Reset match tracker state')
    this.state = this.createEmptyState()
    this.active = false
    this.matchId = undefined
  }

  /**
   * 获取当前比赛状态的深拷贝
   * @returns 全局比赛数据的副本
   */
  getState(): GlobalMatchData {
    return JSON.parse(JSON.stringify(this.state)) as GlobalMatchData
  }

  /**
   * 获取当前比赛ID
   * 优先返回手动设置的matchId，否则返回state中的pseudo_match_id
   */
  getMatchId(): string | undefined {
    return this.matchId ?? this.state.match_info.pseudo_match_id
  }

  /**
   * 处理 onInfoUpdates2 事件
   * 根据feature类型更新相应的状态：
   * - match_info: 更新 pseudo_match_id, game_mode, team_score
   * - me: 更新 steam_id, team
   * - roster: 更新 players 数组（过滤无效玩家，转换team ID为team key）
   * - match_state_changed/game_state_changed: 更新 match_state 或 game_state
   */
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
        const parsed = safeJsonParse<unknown>(playersJson ?? '')
        let players: Dota2Player[] | undefined
        if (Array.isArray(parsed)) {
          players = parsed as Dota2Player[]
        } else if (parsed && typeof parsed === 'object') {
          players = Object.values(parsed as Record<string, Dota2Player>)
        }
        if (players) {
          const validPlayers = filterRosterPlayers(players)
          this.state.roster.players = validPlayers.map((player) => {
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

  /**
   * 处理 onNewEvents 事件
   * - match_state_changed: 更新match_state，检查起点信号
   * - game_state_changed: 更新game_state和match_state，检查起点信号
   * - match_ended: 更新winner
   * - 检查终点信号（game_over/match_ended）
   * @returns 'start' | 'end' | undefined - 比赛起点/终点信号
   */
  handleNewEvents(payload: Dota2EventPayload): MatchSignal | undefined {
    let signal: MatchSignal | undefined
    payload.events.forEach((event) => {
      const data = safeJsonParse<Record<string, unknown>>(event.data)

    
      if (event.name === 'match_state_changed') {
        const matchStatePayload = data as {
          match_state?: Dota2MatchState
          game_state?: Dota2MatchState
        }
        const matchState =
          matchStatePayload?.match_state ?? matchStatePayload?.game_state
        if (matchState) {
          this.state.game.match_state = matchState
          if (this.shouldStart(matchState)) {
            signal = 'start'
          }
        }
      }

      if (event.name === 'game_state_changed') {
        const gamePayload = data as {
          game_state?: Dota2GameState
          match_state?: Dota2MatchState
          game?: { game_state?: Dota2GameState; match_state?: Dota2MatchState }
        }
        const gameState =
          gamePayload?.game_state ?? gamePayload?.game?.game_state
        if (gameState) {
          this.state.game.game_state = gameState
        }
        const matchState =
          gamePayload?.match_state ?? gamePayload?.game?.match_state
        if (matchState) {
          
          this.state.game.match_state = matchState
          if (this.shouldStart(matchState as Dota2MatchState)) {
            signal = 'start'
          }
        }
      }

      if (event.name === 'match_ended') {
        const payload = data as {
          winner?: Dota2TeamKey
        }
        const winner = payload?.winner 
        this.state.game.winner = winner as Dota2Team
      }
    })

    if(this.shouldEnd(payload)) {
      this.logger.info('match:', this.state)
      signal = 'end'
      return signal
    }
    this.logger.info('match:', this.state)
    return signal
  }

  /**
   * 判断是否应该触发终点信号
   * 检查事件列表中是否包含 game_over 或 match_ended 事件
   * @returns true表示比赛已结束，false表示比赛仍在进行
   */
  shouldEnd(events: Dota2EventPayload): boolean {
    const res = events.events.some((event) => MATCH_END_EVENTS.has(event.name))
    if (res) this.logger.info('END')
    return res
  }

  /**
   * 判断是否应该触发起点信号
   * 条件：match_state为策略时间或游戏进行中，且active标志为false（确保每局只触发一次）
   * @returns true表示比赛已开始，false表示比赛尚未开始
   */
  shouldStart(matchState: Dota2MatchState): boolean {
    const res = !this.active && MATCH_START_STATES.includes(matchState)
    if (res) {
      this.active = true
      this.logger.info('START')
      return true
    }
    return false
  }

  /**
   * 创建空的比赛状态对象
   * 用于初始化和重置
   */
  private createEmptyState(): GlobalMatchData {
    return {
      match_info: {},
      me: {},
      roster: {},
      game: {},
    }
  }
}

