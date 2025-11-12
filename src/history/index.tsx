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

function HistoryApp() {
  const api = useBackgroundApi()
  const { t } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<PlayerViewModel[]>([])

  const loadPlayers = useCallback(
    async (state: GlobalMatchData, nextMatch: MatchRecord | null) => {
      if (!api) return
      try {
        const data = await hydratePlayers(api, state, nextMatch, 'history')
        setPlayers(data)
      } catch (error) {
        console.error('[HistoryApp] Failed to hydrate players', error)
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
        console.error('[HistoryApp] Failed to fetch current match', error)
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
          console.error('[HistoryApp] Failed to refresh match data', error)
        })
    }

    window.addEventListener('background:history:data', handler)
    return () => {
      window.removeEventListener('background:history:data', handler)
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

  return (
    <div className="flex h-screen flex-col bg-slate-900/90 p-4 text-slate-50 shadow-xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-200">
        <button className="btn-secondary" onClick={() => api?.windows.hideHistory()}>
          {t('ingame.close')}
        </button>
        <button className="btn-secondary" onClick={() => api?.windows.dragHistory()}>
          Drag
        </button>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/80 p-3">
        <h2 className="mb-3 text-lg font-semibold">{t('ingame.history.title')}</h2>
        {historyContent}
        {match?.matchId && (
          <div className="mt-4 text-right text-xs text-slate-400">Match ID: {match.matchId}</div>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <HistoryApp />
    </I18nProvider>
  </React.StrictMode>,
)
