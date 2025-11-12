import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBackgroundApi } from '../shared/hooks/useBackgroundApi'
import { useBackgroundEvents } from '../shared/hooks/useBackgroundEvents'
import { I18nProvider, useI18n } from '../shared/i18n'
import type { MatchRecord } from '../shared/types/database'
import type { GlobalMatchData } from '../shared/types/dota2'
import { hydratePlayers, type PlayerViewModel } from '../shared/ingame/players'
import '../shared/styles/global.css'

function CommentApp() {
  const api = useBackgroundApi()
  const { t, ratingLabels } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<PlayerViewModel[]>([])
  const [status, setStatus] = useState<string | null>(null)

  const loadPlayers = useCallback(
    async (state: GlobalMatchData, nextMatch: MatchRecord | null) => {
      if (!api) return
      try {
        const data = await hydratePlayers(api, state, nextMatch, 'editor')
        setPlayers(data)
        setStatus(null)
      } catch (error) {
        console.error('[CommentApp] Failed to hydrate players', error)
      }
    },
    [api],
  )

  useEffect(() => {
    if (!api) return
    let cancelled = false
    api.match
      .getCurrent()
      .then(({ state, match: currentMatch }) => {
        if (cancelled) return
        setMatch(currentMatch)
        return loadPlayers(state, currentMatch)
      })
      .catch((error) => {
        console.error('[CommentApp] Failed to fetch current match', error)
      })
    return () => {
      cancelled = true
    }
  }, [api, loadPlayers])

  useEffect(() => {
    if (!api) return

    const handler = () => {
      void api.match
        .getCurrent()
        .then(({ state, match: currentMatch }) => {
          setMatch(currentMatch)
          return loadPlayers(state, currentMatch)
        })
        .catch((error) => {
          console.error('[CommentApp] Failed to refresh match data', error)
        })
    }

    window.addEventListener('background:comment:data', handler)
    return () => {
      window.removeEventListener('background:comment:data', handler)
    }
  }, [api, loadPlayers])

  useBackgroundEvents(api, 'match:start', async () => {
    if (!api) return
    const { state, match: currentMatch } = await api.match.getCurrent()
    setMatch(currentMatch)
    await loadPlayers(state, currentMatch)
  })

  useBackgroundEvents(api, 'match:end', async () => {
    if (!api) return
    const { state, match: currentMatch } = await api.match.getCurrent()
    setMatch(currentMatch)
    await loadPlayers(state, currentMatch)
  })

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
      console.error('[CommentApp] Failed to save comment', error)
      setPlayers((prev) =>
        prev.map((item) => (item.playerId === playerId ? { ...item, status: t('toast.failed') } : item)),
      )
      setStatus(t('toast.failed'))
    }
  }

  const editorContent = useMemo(
    () => (
      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.playerId} className="space-y-3 rounded border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex justify-between text-sm text-slate-200">
              <span>{player.name ?? player.playerId}</span>
              <span>{player.hero ?? '--'}</span>
            </div>
            <StarRating
              score={player.score ?? 3}
              labels={ratingLabels}
              onChange={(score) => handleScoreChange(player.playerId, score)}
            />
            <textarea
              className="w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none"
              placeholder={t('ingame.comment.placeholder')}
              value={player.comment ?? ''}
              onChange={(event) => handleCommentChange(player.playerId, event.target.value)}
            />
            {player.status && <div className="text-right text-xs text-slate-400">{player.status}</div>}
          </div>
        ))}
      </div>
    ),
    [players, ratingLabels, t],
  )

  return (
    <div className="flex h-screen flex-col bg-slate-900/90 p-4 text-slate-50 shadow-xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-200">
        <button className="btn-secondary" onClick={() => api?.windows.hideComment()}>
          {t('ingame.close')}
        </button>
        <button className="btn-secondary" onClick={() => api?.windows.dragComment()}>
          Drag
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 p-3">
        <h2 className="mb-3 text-lg font-semibold">{t('ingame.edit.title')}</h2>
        {editorContent}
        {match?.matchId && (
          <div className="mt-4 text-right text-xs text-slate-400">Match ID: {match.matchId}</div>
        )}
      </div>
      {status && <div className="mt-3 text-center text-sm text-slate-200">{status}</div>}
    </div>
  )
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <CommentApp />
    </I18nProvider>
  </React.StrictMode>,
)
