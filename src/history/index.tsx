import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBackgroundApi } from '../shared/hooks/useBackgroundApi'
import { useBackgroundEvents } from '../shared/hooks/useBackgroundEvents'
import { I18nProvider, useI18n } from '../shared/i18n'
import type { MatchRecord } from '../shared/types/database'
import { hydratePlayers, type PlayerViewModel } from '../shared/ingame/players'
import { getHeroImage } from '../shared/utils/heroes'
import '../shared/styles/global.css'
import { joinComments, type PlayerHistoryStats } from '../shared/utils/playerStats'
import { sortPlayersForOverlay } from '../shared/utils/playerOrder'
type OverlayPlayer = PlayerViewModel & { historyStats?: PlayerHistoryStats }

function formatAverageLabel(score: number | null | undefined, labels: Record<number, string>): string {
  if (score == null) return '--'
  const clamped = Math.max(1, Math.min(5, score))
  const base = Math.min(5, Math.floor(clamped))
  const label = labels[base] ?? ''
  if (!label) return score.toFixed(1)
  const fractional = clamped - base
  if (fractional >= 0.5 && base < 5) {
    return `${label}+`
  }
  return label
}

function HistoryApp() {
  const api = useBackgroundApi()
  const { t, ratingLabels } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<OverlayPlayer[]>([])
  const queryMatchId = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('matchId')
    } catch {
      return null
    }
  }, [])

  const loadLatestMatch = useCallback(async () => {
    if (!api) return
    try {
      const targetMatchId = queryMatchId
      let latestMatch: MatchRecord | null = null

      if (targetMatchId) {
        const { items } = await api.data.getMatches({ matchId: targetMatchId, page: 1, pageSize: 1 })
        latestMatch = items[0] ?? null
      } else {
        const { items } = await api.data.getMatches({ page: 1, pageSize: 1 })
        latestMatch = items[0] ?? null
      }

      let rosterPlayers = latestMatch?.players ?? []

      if (!rosterPlayers.length) {
        try {
          const { state, match: currentMatch } = await api.match.getCurrent()
          const fallbackPlayers = state?.roster?.players ?? currentMatch?.players ?? []
          const matchesTarget = targetMatchId ? currentMatch?.matchId === targetMatchId : true
          if (matchesTarget) {
            rosterPlayers = fallbackPlayers
            if (!latestMatch && currentMatch) {
              latestMatch = currentMatch
            } else if (
              latestMatch &&
              currentMatch &&
              currentMatch.matchId === latestMatch.matchId &&
              rosterPlayers.length
            ) {
              latestMatch = { ...latestMatch, players: rosterPlayers }
            }
          }
        } catch (error) {
          console.error('[HistoryApp] Failed to resolve match state fallback', error)
        }
      }

      setMatch(latestMatch)

      if (!rosterPlayers.length) {
        setPlayers([])
        return
      }

      const data = await hydratePlayers(api, rosterPlayers, latestMatch, 'history')
      setPlayers(data as OverlayPlayer[])
    } catch (error) {
      console.error('[HistoryApp] Failed to load latest match data', error)
    }
  }, [api, queryMatchId])

  useEffect(() => {
    if (!api) return
    void loadLatestMatch()
  }, [api, loadLatestMatch])

  useEffect(() => {
    if (!api) return

    const handler = () => {
      void loadLatestMatch()
    }

    window.addEventListener('background:history:data', handler)
    return () => {
      window.removeEventListener('background:history:data', handler)
    }
  }, [api, loadLatestMatch])

  useBackgroundEvents(api, 'match:start', () => {
    void loadLatestMatch()
  })

  useBackgroundEvents(api, 'match:end', () => {
    void loadLatestMatch()
  })

  useEffect(() => {
    if (!players.length) return
    const debugInfo = players.map((player, index) => ({
      index,
      playerId: player.playerId,
      name: player.name,
      team: player.team,
      role: player.role,
      playerIndex: player.playerIndex,
      teamSlot: player.teamSlot,
      historyCount: player.history?.length ?? 0,
      averageScore: player.historyStats?.averageScore ?? null,
    }))
    console.groupCollapsed('[HistoryOverlay] Players (match)', match?.matchId ?? 'unknown')
    console.table(debugInfo)
    console.groupEnd()
  }, [match?.matchId, players])

  const historyContent = useMemo(() => {
    if (players.length === 0) {
      return (
        <div id="history-content-empty" className="flex h-full w-full items-center justify-center text-xs text-slate-400">
          {t('ingame.history.empty')}
        </div>
      )
    }

    const orderedPlayers = sortPlayersForOverlay(players, 'history') as OverlayPlayer[]

    return (
      <div
        id="history-player-list"
        className="grid h-full w-full grid-cols-10 gap-2 auto-rows-fr"
        style={{ gridAutoRows: 'minmax(0, 120px)' }}
      >
        {orderedPlayers.map((player) => {
          const heroImage = getHeroImage(player.hero)
          const stats = player.historyStats
          const winRateText = stats?.winRate != null ? `${stats.winRate}%` : '--'
          const averageScore = stats?.averageScore ?? null
          const averageLabel = formatAverageLabel(averageScore, ratingLabels)
          const { text: commentSummary, hasContent } = joinComments(stats?.comments)

          return (
            <div
              key={player.playerId}
              className="flex h-full max-h-[120px] flex-col justify-between rounded border border-slate-700 bg-slate-900/80 p-2 shadow-sm"
            >
              <div className="flex items-center gap-1">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={player.hero ?? 'hero'}
                    className="h-8 w-8 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-[10px] text-slate-300">
                    ?
                  </div>
                )}
                <div className="flex-1 break-words text-[11px] font-medium leading-tight">
                  {player.name ?? player.playerId}
                </div>
              </div>
              <div className="mt-2 flex flex-1 flex-col justify-between gap-1 rounded bg-slate-800/60 p-2 text-[11px] text-slate-200">
                <div className="leading-tight">胜率：{winRateText}</div>
                <div className="leading-tight">
                  评价：{averageLabel} {averageScore != null ? averageScore.toFixed(1) : '--'}
                </div>
                <div
                  className="truncate leading-tight"
                  title={hasContent ? commentSummary : undefined}
                >
                  点评：{commentSummary}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [match, players, ratingLabels, t])

  return (
    <div id="history-window" className="flex h-full w-full flex-col rounded-lg border border-slate-700 bg-slate-900/90 text-slate-50 shadow-xl">
      <div id="history-window-header" className="flex items-center justify-between px-2 py-1 text-[11px]">
        {match?.matchId && <div className="text-[10px] text-slate-400">Match ID: {match.matchId}</div>}
      </div>
      <div id="history-window-body" className="h-full w-full overflow-y-auto px-2 pb-1">
        {historyContent}
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
