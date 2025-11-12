import type { BackgroundApi, CommentWithPlayer } from '../types/api'
import type { MatchRecord } from '../types/database'
import type { Dota2Player, GlobalMatchData } from '../types/dota2'

export type IngameMode = 'history' | 'editor'

export interface PlayerViewModel {
  playerId: string
  name?: string
  hero?: string
  comment?: string
  score?: number
  history: CommentWithPlayer[]
  status?: string
}

export async function hydratePlayers(
  api: BackgroundApi,
  state: GlobalMatchData,
  match: MatchRecord | null,
  mode: IngameMode,
): Promise<PlayerViewModel[]> {
  const roster = state.roster.players ?? match?.players ?? []
  const uniquePlayers = deduplicatePlayers(roster)

  const result = await Promise.all(
    uniquePlayers.map(async (player) => {
      let historyResponse: { items: CommentWithPlayer[] } = { items: [] }
      if (player.steamId) {
        historyResponse = await api.data.getComments({ playerId: player.steamId, pageSize: 5 })
      }
      const currentMatch = match ? historyResponse.items.find((item) => item.matchId === match.matchId) : undefined

      return {
        playerId: player.steamId ?? `unknown-${player.player_index}`,
        name: player.name,
        hero: player.hero,
        history: historyResponse.items,
        comment: mode === 'editor' ? currentMatch?.comment ?? '' : undefined,
        score: mode === 'editor' ? currentMatch?.score ?? 3 : currentMatch?.score,
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
