import React from 'react'
import ReactDOM from 'react-dom/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBackgroundApi } from '../shared/hooks/useBackgroundApi'
import { useBackgroundEvents } from '../shared/hooks/useBackgroundEvents'
import { I18nProvider, useI18n } from '../shared/i18n'
import type { MatchRecord } from '../shared/types/database'
import { hydratePlayers, type PlayerViewModel } from '../shared/ingame/players'
import { getHeroImage } from '../shared/utils/heroes'
import { sortPlayersForOverlay } from '../shared/utils/playerOrder'
import '../shared/styles/global.css'

function CommentApp() {
  const api = useBackgroundApi()
  const { t, ratingLabels } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<PlayerViewModel[]>([])
  const [status, setStatus] = useState<string | null>(null)
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
          console.error('[CommentApp] Failed to resolve match state fallback', error)
        }
      }

      setMatch(latestMatch)

      if (!rosterPlayers.length) {
        setPlayers([])
        return
      }

      const data = await hydratePlayers(api, rosterPlayers, latestMatch, 'editor')
      setPlayers(data)
      setStatus(null)
    } catch (error) {
      console.error('[CommentApp] Failed to load latest match data', error)
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

    window.addEventListener('background:comment:data', handler)
    return () => {
      window.removeEventListener('background:comment:data', handler)
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
    }))
    console.groupCollapsed('[CommentOverlay] Players (match)', match?.matchId ?? 'unknown')
    console.table(debugInfo)
    console.groupEnd()
  }, [match?.matchId, players])

  const handleCommentChange = async (playerId: string, value: string) => {
    if (playerId.startsWith('unknown-')) return
    setPlayers((prev) => prev.map((item) => (item.playerId === playerId ? { ...item, comment: value } : item)))
    await persistChange(playerId, { comment: value })
  }

  const handleScoreChange = async (playerId: string, value: number) => {
    if (playerId.startsWith('unknown-')) return
    setPlayers((prev) => prev.map((item) => (item.playerId === playerId ? { ...item, score: value } : item)))
    await persistChange(playerId, { score: value })
  }

  const persistChange = async (playerId: string, patch: { score?: number; comment?: string }) => {
    if (!api || !match) return
    const player = players.find((p) => p.playerId === playerId)
    if (!player || playerId.startsWith('unknown-')) return
    const payload = {
      matchId: match.matchId,
      playerId,
      score: patch.score ?? player.score ?? 3,
      comment: patch.comment ?? player.comment ?? '',
    }
    try {
      const record = await api.data.saveComment(payload)
      setPlayers((prev) =>
        prev.map((item) =>
          item.playerId === playerId
            ? { ...item, score: record.score, comment: record.comment }
            : item,
        ),
      )
      setStatus(t('toast.saved'))
    } catch (error) {
      console.error('[CommentApp] Failed to save comment', error)
      setStatus(t('toast.failed'))
    }
  }

  const editorContent = useMemo(() => {
    if (players.length === 0) {
      return (
        <div id="comment-editor-empty" className="flex h-full w-full items-center justify-center text-xs text-slate-400">
          {t('home.noData')}
        </div>
      )
    }

    const orderedPlayers = sortPlayersForOverlay(players, 'comment')
    const winningTeam = match?.winner
    const myPlayerId = match?.playerId ?? null

    return (
      <div
        id="comment-editor-list"
        className="grid h-full w-full grid-cols-10 gap-2 auto-rows-fr content-start"
        style={{ gridAutoRows: 'minmax(0, 120px)' }}
      >
        {orderedPlayers.map((player) => {
          const heroImage = getHeroImage(player.hero)
          const isEditable = !player.playerId.startsWith('unknown-')
          const team = player.team
          const isRadiant = team === 'radiant'
          const isDire = team === 'dire'
          const backgroundColor = isRadiant ? '#29880e' : isDire ? '#dd3d1d' : '#1f293780'
          const isWinner =
            winningTeam && winningTeam !== 'none' && team && team === winningTeam
          const borderColor = isWinner ? '#ffff2c' : '#334155'
          const isSelf = myPlayerId != null && player.playerId === myPlayerId

          return (
            <div
              key={player.playerId}
              className="flex h-full max-h-[120px] flex-col rounded border p-2 shadow-sm text-slate-50"
              style={{ borderColor }}
            >
              <div className="flex items-center gap-1" style={{ backgroundColor: isSelf ? '#317595' : backgroundColor }}>
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={player.hero ?? 'hero'}
                    className="h-8 w-8 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-black/30 text-[10px] text-slate-200">
                    ?
                  </div>
                )}
                <div
                  className="flex-1 break-words text-[11px] font-medium leading-tight"
                >
                  {player.name ?? player.playerId}
                </div>
              </div>
              <div className="mt-1 flex justify-center">
                <StarRating
                  score={player.score ?? 3}
                  labels={ratingLabels}
                  onChange={(score) => handleScoreChange(player.playerId, score)}
                  size="compact"
                  disabled={!isEditable}
                />
              </div>
              <div className="mt-2 flex flex-1 flex-col">
                <textarea
                  className="min-h-10 w-full flex-1 resize-none rounded border border-white/40 bg-black/30 px-2 py-1 text-[11px] leading-tight focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder={t('ingame.comment.placeholder')}
                  value={player.comment ?? ''}
                  onChange={(event) => handleCommentChange(player.playerId, event.target.value)}
                  disabled={!isEditable}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [handleCommentChange, handleScoreChange, match, players, ratingLabels, t])

  return (
    <div id="comment-window" className="flex h-full w-full flex-col rounded-lg border border-slate-700 bg-slate-900/90 text-slate-50 shadow-xl">
      <div id="comment-window-header" className="flex items-center justify-between px-2 py-1 text-[11px]">
        <div className="flex items-center gap-3">
          {status && <div className="text-[10px] text-slate-200">{status}</div>}
          {match?.matchId && <div className="text-[10px] text-slate-400">Match ID: {match.matchId}</div>}
        </div>
      </div>
      <div id="comment-window-body" className="h-full w-full overflow-y-auto px-2 pb-1">
        {editorContent}
      </div>
    </div>
  )
}

function StarRating({
  score,
  labels,
  onChange,
  size = 'default',
  disabled = false,
}: {
  score: number
  labels: Record<number, string>
  onChange: (score: number) => void
  size?: 'default' | 'compact'
  disabled?: boolean
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  useEffect(() => {
    setIsAnimating(true)
    const timer = window.setTimeout(() => setIsAnimating(false), 100)
    return () => window.clearTimeout(timer)
  }, [score])

  const stars = [1, 2, 3, 4, 5]
  const starClass = size === 'compact' ? 'text-sm leading-none' : 'text-2xl'
  const labelClass = size === 'compact' ? 'text-[12px]' : 'text-sm'

  return (
    <div className="flex  gap-1">
      <div
        className={`${labelClass} text-slate-200 transform transition-transform duration-100 ease-out ${
          isAnimating ? 'scale-[1.2]' : 'scale-100'
        }`}
        title={labels[score] ?? ''}
      >
        {labels[score] ?? ''}
      </div>
      <div className="flex items-center gap-[2px]">
        {stars.map((value) => (
          <button
            key={value}
            type="button"
            className={`${starClass} ${disabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
            onClick={() => {
              if (!disabled) {
                onChange(value)
              }
            }}
            aria-label={labels[value] ?? `Star ${value}`}
            aria-disabled={disabled}
          >
            {value <= score ? '⭐' : '☆'}
          </button>
        ))}
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
