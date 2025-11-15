import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useI18n } from '../../shared/i18n'
import type { BackgroundApi, CommentWithPlayer } from '../../shared/types/api'
import type { MatchRecord } from '../../shared/types/database'
import { Dota2GameState, Dota2PlayerRole, Dota2Team } from '../../shared/types/dota2'
import { formatMatchResult } from '../utils/match'

interface MatchDetailPageProps {
  api: BackgroundApi | undefined
}

export function MatchDetailPage({ api }: MatchDetailPageProps) {
  const { matchId = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [comments, setComments] = useState<CommentWithPlayer[]>([])

  useEffect(() => {
    if (!api || !matchId) return
    let cancelled = false
    const loadMatch = async () => {
      try {
        const [matchResult, commentsResult] = await Promise.all([
          api.data.getMatches({ matchId }),
          api.data.getComments({ matchId }),
        ])
        if (cancelled) return

        const resolvedMatch = matchResult.items[0] ?? null
        setMatch(resolvedMatch)
        setComments(commentsResult.items)
      } catch (error) {
        if (!cancelled) {
          setMatch(null)
          setComments([])
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

  const players = match.players ?? []
  const radiantPlayers = players.filter((p) => p.team === Dota2Team.RADIANT)
  const direPlayers = players.filter((p) => p.team === Dota2Team.DIRE)

  const getPlayerComment = (playerId: string) => {
    return comments.find((c) => c.playerId === playerId)
  }

  const formatRole = (role?: number | Dota2PlayerRole) => {
    if (!role) return '--'
    const roles: string[] = []
    if (role & Dota2PlayerRole.CARRY) roles.push('Carry')
    if (role & Dota2PlayerRole.OFFLANER) roles.push('Offlaner')
    if (role & Dota2PlayerRole.MIDLANER) roles.push('Midlaner')
    if (role & Dota2PlayerRole.SUPPORT) roles.push('Support')
    if (role & Dota2PlayerRole.HARD_SUPPORT) roles.push('Hard Support')
    return roles.join(', ') || '--'
  }

  const formatTeamScore = () => {
    if (!match.teamScore) return t('matches.unknown')
    const radiant = match.teamScore[Dota2Team.RADIANT] ?? 0
    const dire = match.teamScore[Dota2Team.DIRE] ?? 0
    return `Radiant ${radiant} : ${dire} Dire`
  }

  const isSpectating = match.gameState === Dota2GameState.SPECTATING

  return (
    <div id="desktop-match-detail" className="h-full overflow-y-auto px-6 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
        >
          ← {t('common.back')}
        </button>
      </div>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-lg font-semibold">{t('match.detail.title')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400">{t('matches.matchId')}</div>
            <div>{match.matchId}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('matches.gameMode')}</div>
            <div>{match.gameMode?.game_mode ?? match.gameMode?.lobby_type ?? '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.time')}</div>
            <div>{new Date(match.updatedAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.score')}</div>
            <div>{formatTeamScore()}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.winner')}</div>
            <div>{formatMatchResult(match, t)}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('matches.spectating')}</div>
            <div>{isSpectating ? t('matches.yes') : t('matches.no')}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('match.detail.players')}</h3>
        <div className="mt-4 space-y-6">
          {/* Radiant Team */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-green-400">Radiant</h4>
            <div className="space-y-2">
              {radiantPlayers.length === 0 && <div className="text-slate-400 text-sm">{t('home.noData')}</div>}
              {radiantPlayers
                .sort((a, b) => (a.player_index ?? 0) - (b.player_index ?? 0))
                .map((player) => {
                  const comment = getPlayerComment(player.steamId ?? '')
                  return (
                    <div
                      key={player.player_index ?? player.steamId ?? Math.random()}
                      className="flex items-center justify-between rounded border border-slate-700/50 bg-slate-900/60 px-3 py-2 cursor-pointer hover:bg-slate-800/60"
                      onClick={() => player.steamId && navigate(`/players/${player.steamId}`)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{player.name ?? '--'}</div>
                        <div className="text-xs text-slate-400">{player.steamId ?? ''}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        <span>{player.hero ?? '--'}</span>
                        <span className="text-xs">{formatRole(player.role)}</span>
                        {comment && (
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⭐{comment.score}</span>
                            {comment.comment && (
                              <span className="max-w-xs truncate text-xs text-slate-400" title={comment.comment}>
                                {comment.comment}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Dire Team */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-red-400">Dire</h4>
            <div className="space-y-2">
              {direPlayers.length === 0 && <div className="text-slate-400 text-sm">{t('home.noData')}</div>}
              {direPlayers
                .sort((a, b) => (a.player_index ?? 0) - (b.player_index ?? 0))
                .map((player) => {
                  const comment = getPlayerComment(player.steamId ?? '')
                  return (
                    <div
                      key={player.player_index ?? player.steamId ?? Math.random()}
                      className="flex items-center justify-between rounded border border-slate-700/50 bg-slate-900/60 px-3 py-2 cursor-pointer hover:bg-slate-800/60"
                      onClick={() => player.steamId && navigate(`/players/${player.steamId}`)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{player.name ?? '--'}</div>
                        <div className="text-xs text-slate-400">{player.steamId ?? ''}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        <span>{player.hero ?? '--'}</span>
                        <span className="text-xs">{formatRole(player.role)}</span>
                        {comment && (
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">⭐{comment.score}</span>
                            {comment.comment && (
                              <span className="max-w-xs truncate text-xs text-slate-400" title={comment.comment}>
                                {comment.comment}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

