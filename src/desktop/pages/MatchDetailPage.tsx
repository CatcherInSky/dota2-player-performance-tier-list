import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useI18n } from '../../shared/i18n'
import type { BackgroundApi } from '../../shared/types/api'
import type { MatchRecord } from '../../shared/types/database'
import type { Dota2Player } from '../../shared/types/dota2'
import { formatMatchResult } from '../utils/match'

interface MatchDetailPageProps {
  api: BackgroundApi | undefined
}

export function MatchDetailPage({ api }: MatchDetailPageProps) {
  const { matchId = '' } = useParams()
  const { t } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [players, setPlayers] = useState<Dota2Player[]>([])

  useEffect(() => {
    if (!api || !matchId) return
    let cancelled = false
    const loadMatch = async () => {
      try {
        const result = await api.data.getMatches({ matchId })
        if (cancelled) return

        let resolvedMatch: MatchRecord | null = result.items[0] ?? null
        let rosterPlayers = resolvedMatch?.players ?? []

        if (!rosterPlayers.length) {
          try {
            const { state, match: currentMatch } = await api.match.getCurrent()
            rosterPlayers = state?.roster?.players ?? currentMatch?.players ?? []
            if (!resolvedMatch && currentMatch?.matchId === matchId) {
              resolvedMatch = currentMatch
            } else if (
              resolvedMatch &&
              currentMatch &&
              currentMatch.matchId === resolvedMatch.matchId &&
              rosterPlayers.length &&
              !resolvedMatch.players?.length
            ) {
              resolvedMatch = { ...resolvedMatch, players: rosterPlayers }
            }
          } catch (error) {
            console.error('[MatchDetailPage] Failed to resolve players fallback', error)
          }
        }

        if (cancelled) return

        setMatch(resolvedMatch)
        setPlayers(rosterPlayers)
      } catch (error) {
        if (!cancelled) {
          setMatch(null)
          setPlayers([])
        }
        console.error('[MatchDetailPage] Failed to load match details', error)
      }
    }
    void loadMatch()
    return () => {
      cancelled = true
    }
  }, [api, matchId])

  if (!match) {
    return (
      <div id="desktop-match-detail-empty" className="flex h-full items-center justify-center text-slate-400">
        {t('home.noData')}
      </div>
    )
  }

  return (
    <div id="desktop-match-detail" className="h-full overflow-y-auto px-6 py-4 space-y-6">
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-lg font-semibold">{t('match.detail.title')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400">{t('matches.matchId')}</div>
            <div>{match.matchId}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('matches.gameMode')}</div>
            <div>{match.gameMode?.game_mode ?? '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.score')}</div>
            <div>
              {match.teamScore ? `${match.teamScore.radiant ?? 0} : ${match.teamScore.dire ?? 0}` : t('matches.unknown')}
            </div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.winner')}</div>
            <div>{formatMatchResult(match, t)}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('match.detail.players')}</h3>
        <div className="mt-4 grid gap-2">
          {players.length === 0 && <div className="text-slate-400">{t('home.noData')}</div>}
          {players.map((player) => (
            <div
              key={player.player_index ?? player.steamId ?? Math.random()}
              className="flex items-center justify-between rounded border border-slate-700/50 bg-slate-900/60 px-3 py-2"
            >
              <div>
                <div className="font-medium">{player.name ?? '--'}</div>
                <div className="text-xs text-slate-400">{player.steamId ?? ''}</div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-300">
                <span>{player.hero ?? '--'}</span>
                <span>{player.team}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

