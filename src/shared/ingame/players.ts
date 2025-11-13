import type { BackgroundApi, CommentWithPlayer } from '../types/api'
import type { MatchRecord } from '../types/database'
import type { Dota2Player, Dota2TeamKey, GlobalMatchData } from '../types/dota2'
import { buildPlayerHistoryStats, normalizeTeam, type PlayerHistoryStats } from '../utils/playerStats'
import { filterRosterPlayers } from '../utils/roster'

export type IngameMode = 'history' | 'editor'

export interface PlayerViewModel {
  playerId: string
  name?: string
  hero?: string
  comment?: string
  score?: number
  history: CommentWithPlayer[]
  historyStats?: PlayerHistoryStats
  team?: Dota2TeamKey | null
  role?: number | null
  playerIndex?: number | null
  teamSlot?: number | null
}

export async function hydratePlayers(
  api: BackgroundApi,
  source: GlobalMatchData | Dota2Player[] | undefined,
  match: MatchRecord | null,
  mode: IngameMode,
): Promise<PlayerViewModel[]> {
  const rawPlayers = Array.isArray(source) ? source : source?.roster?.players ?? []
  const rosterPlayers = filterRosterPlayers(rawPlayers)
  const fallbackMatchPlayers = match?.players ? filterRosterPlayers(match.players) : []
  const basePlayers = rosterPlayers.length ? rosterPlayers : fallbackMatchPlayers
  const uniquePlayers = deduplicatePlayers(basePlayers)
  const matchId = match?.matchId

  let matchComments: CommentWithPlayer[] = []
  if (mode === 'editor' && matchId) {
    try {
      const response = await api.data.getComments({ matchId, page: 1, pageSize: 100 })
      matchComments = response.items ?? []
    } catch (error) {
      console.error('[hydratePlayers] Failed to fetch match comments', error)
      matchComments = []
    }
  }

  const result = await Promise.all(
    uniquePlayers.map(async (player) => {
      const steamId = player.steamId
      const fallbackId = `unknown-${player.player_index}`
      const playerId = steamId ?? fallbackId

      let history: CommentWithPlayer[] = []
      let currentComment: CommentWithPlayer | undefined
      let historyStats: PlayerHistoryStats | undefined

      const team = normalizeTeam(player.team)
      const role = typeof player.role === 'number' ? player.role : null
      const playerIndex = typeof player.player_index === 'number' ? player.player_index : null
      const teamSlot = typeof player.team_slot === 'number' ? player.team_slot : null

      if (steamId) {
        if (mode === 'history') {
          try {
            const response = await api.data.getPlayerHistory(steamId)
            const commentRecords = (response as { comments?: CommentWithPlayer[] }).comments ?? []
            const matchRecords = (response as { matches?: MatchRecord[] }).matches ?? []
            const historyRecords: CommentWithPlayer[] = commentRecords.map((item) => ({ ...item }))
            history = historyRecords
            historyStats = buildPlayerHistoryStats(matchRecords, commentRecords, steamId)
          } catch (error) {
            console.error('[hydratePlayers] Failed to fetch player history', steamId, error)
          }
          if (matchId) {
            currentComment = history.find((item) => item.matchId === matchId)
          }
        } else if (mode === 'editor') {
          history = matchComments.filter((item) => item.playerId === steamId)
          currentComment = history[0]
        }
      }

      return {
        playerId,
        name: player.name,
        hero: player.hero,
        history,
        comment: mode === 'editor' ? currentComment?.comment ?? '' : undefined,
        score: mode === 'editor' ? currentComment?.score ?? 3 : currentComment?.score,
        historyStats,
        team,
        role,
        playerIndex,
        teamSlot,
      }
    }),
  )

  return result
}

function deduplicatePlayers(players: Dota2Player[]): Dota2Player[] {
  const map = new Map<string, Dota2Player>()
  players.forEach((player) => {
    const key = player.steamId ?? `idx-${player.player_index}`
    if (!map.has(key)) {
      map.set(key, player)
    }
  })
  return Array.from(map.values())
}
