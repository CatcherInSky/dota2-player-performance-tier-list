import { useEffect, useMemo, useState } from 'react'
import type { BackgroundApi } from '../../shared/api/background'
import { useBackgroundApi } from '../../shared/hooks/useBackgroundApi'
import { useBackgroundEvents } from '../../shared/hooks/useBackgroundEvents'
import { useI18n } from '../../shared/i18n'
import type { CommentWithPlayer } from '../../shared/types/api'
import type { MatchRecord } from '../../shared/types/database'
import type { Dota2Player, GlobalMatchData } from '../../shared/types/dota2'

type Mode = 'history' | 'editor'

interface PlayerViewModel {
  playerId: string
  name?: string
  hero?: string
  comment?: string
  score?: number
  history: CommentWithPlayer[]
  status?: string
}

export function IngameApp() {
  const api = useBackgroundApi()
  const { t, ratingLabels } = useI18n()
  const [mode, setMode] = useState<Mode>('history')
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<PlayerViewModel[]>([])
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!api) return
    let cancelled = false
    api.match.getCurrent().then(async ({ state, match }) => {
      if (cancelled) return
      setMatch(match)
      const data = await hydratePlayers(api, state, match, mode)
      if (!cancelled) {
        setPlayers(data)
      }
    })
    return () => {
      cancelled = true
    }
  }, [api])

  useEffect(() => {
    if (!api) return
    const handler = ((event: CustomEvent<{ mode: Mode; state: GlobalMatchData; match: MatchRecord | null }>) => {
      setMode(event.detail.mode)
      setMatch(event.detail.match)
      void hydratePlayers(api, event.detail.state, event.detail.match, event.detail.mode).then(setPlayers)
    }) as EventListener

    window.addEventListener('background:ingame:data', handler)
    return () => {
      window.removeEventListener('background:ingame:data', handler)
    }
  }, [api])

  useBackgroundEvents(api, 'match:start', async ({ state, match }) => {
    setMode('history')
    setMatch(match)
    const data = await hydratePlayers(api!, state, match, 'history')
    setPlayers(data)
  })

  useBackgroundEvents(api, 'match:end', async ({ state, match }) => {
    setMode('editor')
    setMatch(match)
    const data = await hydratePlayers(api!, state, match, 'editor')
    setPlayers(data)
  })

  const toggleMode = () => {
    setMode((prev) => (prev === 'history' ? 'editor' : 'history'))
  }

  const handleCommentChange = async (playerId: string, value: string) => {
    setPlayers((prev) => prev.map((item) => (item.playerId === playerId ? { ...item, comment: value } : item)))
    await persistChange(playerId, { comment: value })
  }

  const handleScoreChange = async (playerId: string, value: number) => {
    setPlayers((prev) => prev.map((item) => (item.playerId === playerId ? { ...item, score: value } : item)))
    await persistChange(playerId, { score: value })
  }

  const persistChange = async (playerId: string, patch: { score?: number; comment?: string }) => {
    if (!api || !match) return
    const player = players.find((p) => p.playerId === playerId)
    if (!player) return
    const payload = {
      matchId: match.matchId,
      playerId,
      score: patch.score ?? player.score ?? 3,
      comment: patch.comment ?? player.comment ?? '',
    }
    setPlayers((prev) =>
      prev.map((item) => (item.playerId === playerId ? { ...item, status: t('toast.saving') } : item)),
    )
    try {
      const record = await api.data.saveComment(payload)
      setPlayers((prev) =>
        prev.map((item) =>
          item.playerId === playerId
            ? { ...item, score: record.score, comment: record.comment, status: t('toast.saved') }
            : item,
        ),
      )
      setStatus(t('toast.saved'))
    } catch (error) {
      console.error(error)
      setPlayers((prev) =>
        prev.map((item) => (item.playerId === playerId ? { ...item, status: t('toast.failed') } : item)),
      )
      setStatus(t('toast.failed'))
    }
  }

  const historyContent = useMemo(() => {
    if (players.length === 0) {
      return <div className="text-center text-sm text-slate-400">{t('ingame.history.empty')}</div>
    }
    return (
      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.playerId} className="rounded border border-slate-700 bg-slate-900/70 p-3">
            <div className="flex justify-between text-sm text-slate-200">
              <span>{player.name ?? player.playerId}</span>
              <span>{player.hero ?? '--'}</span>
            </div>
            <div className="mt-2 space-y-2">
              {player.history.length === 0 && <div className="text-xs text-slate-400">{t('ingame.history.empty')}</div>}
              {player.history.map((comment) => (
                <div key={comment.uuid} className="rounded bg-slate-800/70 px-3 py-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>⭐ {comment.score}</span>
                    <span>{new Date(comment.updatedAt).toLocaleString()}</span>
                  </div>
                  {comment.comment && <p className="mt-1">{comment.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }, [players, t])

  const editorContent = useMemo(
    () => (
      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.playerId} className="rounded border border-slate-700 bg-slate-900/70 p-4 space-y-3">
            <div className="flex justify-between text-sm text-slate-200">
              <span>{player.name ?? player.playerId}</span>
              <span>{player.hero ?? '--'}</span>
            </div>
            <StarRating
              score={player.score ?? 3}
              labels={ratingLabels}
              onChange={(score) =>
                handleScoreChange(player.playerId, score)
              }
            />
            <textarea
              className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none"
              placeholder={t('ingame.comment.placeholder')}
              value={player.comment ?? ''}
              onChange={(event) =>
                handleCommentChange(player.playerId, event.target.value)
              }
            />
            {player.status && (
              <div className="text-right text-xs text-slate-400">{player.status}</div>
            )}
          </div>
        ))}
      </div>
    ),
    [players, ratingLabels, t],
  )

  return (
    <div className="flex h-screen flex-col bg-slate-900/90 p-4 text-slate-50 shadow-xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-200">
        <button className="btn-secondary" onClick={() => api?.windows.minimizeIngame()}>
          {t('ingame.close')}
        </button>
        <button className="btn-secondary" onClick={() => api?.windows.dragIngame()}>
          Drag
        </button>
        <button className="btn" onClick={toggleMode}>
          {t('ingame.toggleHistory')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 p-3">
        <h2 className="mb-3 text-lg font-semibold">
          {mode === 'history' ? t('ingame.history.title') : t('ingame.edit.title')}
        </h2>
        {mode === 'history' ? historyContent : editorContent}
      </div>
      {status && <div className="mt-3 text-center text-sm text-slate-200">{status}</div>}
    </div>
  )
}

async function hydratePlayers(
  api: BackgroundApi,
  state: GlobalMatchData,
  match: MatchRecord | null,
  mode: Mode,
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

function StarRating({
  score,
  labels,
  onChange,
}: {
  score: number
  labels: Record<number, string>
  onChange: (score: number) => void
}) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="space-y-2 text-center">
      <div className="flex justify-center gap-2">
        {stars.map((value) => (
          <button
            key={value}
            className="text-2xl"
            onClick={() => onChange(value)}
            aria-label={labels[value] ?? `Star ${value}`}
          >
            {value <= score ? '⭐' : '☆'}
          </button>
        ))}
      </div>
      <div className="text-sm text-slate-300" title={labels[score] ?? ''}>
        {labels[score] ?? ''}
      </div>
    </div>
  )
}

