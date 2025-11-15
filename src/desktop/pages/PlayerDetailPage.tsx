import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useI18n } from '../../shared/i18n'
import type { BackgroundApi, PlayerWithStats } from '../../shared/types/api'
import type { CommentRecord, MatchRecord } from '../../shared/types/database'
import { Dota2PlayerRole } from '../../shared/types/dota2'
import { DataTable } from '../components/DataTable'
import { formatMatchResult } from '../utils/match'

interface PlayerDetailPageProps {
  api: BackgroundApi | undefined
}

/**
 * PlayerDetailPage - 玩家详情页组件
 * 显示玩家的完整信息：
 * - 基础信息（名称、ID、曾用名）
 * - 遭遇统计
 * - 队友/对手统计
 * - 英雄统计
 * - 位置统计
 * - 遭遇比赛表
 * - 评分记录表
 */
export function PlayerDetailPage({ api }: PlayerDetailPageProps) {
  const { playerId = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<PlayerWithStats | null>(null)
  const [comments, setComments] = useState<CommentRecord[]>([])
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [stats, setStats] = useState<{
    teammateGames: number
    teammateWins: number
    opponentGames: number
    opponentWins: number
    roleStats: Array<{ role: string; count: number; wins: number }>
  } | null>(null)

  const parseRole = (role: number | Dota2PlayerRole): string[] => {
    const roles: string[] = []
    if (role & Dota2PlayerRole.CARRY) roles.push('Carry')
    if (role & Dota2PlayerRole.OFFLANER) roles.push('Offlaner')
    if (role & Dota2PlayerRole.MIDLANER) roles.push('Midlaner')
    if (role & Dota2PlayerRole.SUPPORT) roles.push('Support')
    if (role & Dota2PlayerRole.HARD_SUPPORT) roles.push('Hard Support')
    return roles
  }

  useEffect(() => {
    if (!api || !playerId) {
      console.warn('[PlayerDetailPage] Missing api or playerId:', { api: !!api, playerId })
      return
    }
    let cancelled = false
    const loadData = async () => {
      try {
        console.log('[PlayerDetailPage] Loading player history for:', playerId)
        console.log('[PlayerDetailPage] API available:', !!api, 'getPlayerHistory:', typeof api.data.getPlayerHistory)
        const response = await api.data.getPlayerHistory(playerId)
        if (cancelled) return

        console.log('[PlayerDetailPage] Response:', response)
        const { player: playerData, comments: commentsData, matches: matchesData } = response

        if (!playerData) {
          console.warn('[PlayerDetailPage] Player not found:', playerId)
          setPlayer(null)
          setComments([])
          setMatches([])
          return
        }

        console.log('[PlayerDetailPage] Player data loaded:', playerData)
        setPlayer(playerData)
        setComments(commentsData || [])
        setMatches(matchesData || [])

        // 计算队友/对手统计
        if (playerData && matchesData.length > 0) {
          let teammateGames = 0
          let teammateWins = 0
          let opponentGames = 0
          let opponentWins = 0

          const roleMap = new Map<string, { count: number; wins: number }>()

          for (const matchStat of playerData.matchList) {
            const match = matchesData.find((m) => m.matchId === matchStat.matchId)
            if (!match || !match.me?.team) continue

            if (matchStat.team === match.me.team) {
              teammateGames++
              if (matchStat.isWin) teammateWins++
            } else {
              opponentGames++
              if (matchStat.isWin) opponentWins++
            }

            // 统计位置
            if (matchStat.role) {
              const roles = parseRole(matchStat.role)
              roles.forEach((role) => {
                const existing = roleMap.get(role) || { count: 0, wins: 0 }
                existing.count++
                if (matchStat.isWin) existing.wins++
                roleMap.set(role, existing)
              })
            }
          }

          const roleStats = Array.from(roleMap.entries())
            .map(([role, stats]) => ({ role, ...stats }))
            .sort((a, b) => b.count - a.count)

          setStats({
            teammateGames,
            teammateWins,
            opponentGames,
            opponentWins,
            roleStats,
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('[PlayerDetailPage] Failed to load data')
        console.error('[PlayerDetailPage] Error message:', errorMessage)
        if (errorStack) {
          console.error('[PlayerDetailPage] Error stack:', errorStack)
        }
        console.error('[PlayerDetailPage] Error object:', error)
        console.error('[PlayerDetailPage] Context:', {
          playerId,
          apiAvailable: !!api,
          apiDataAvailable: !!(api?.data),
          getPlayerHistoryAvailable: !!(api?.data?.getPlayerHistory),
        })
        setPlayer(null)
        setComments([])
        setMatches([])
      }
    }
    void loadData()
    return () => {
      cancelled = true
    }
  }, [api, playerId])

  if (!player || !player.playerId) {
    return (
      <div id="desktop-player-detail-empty" className="flex h-full items-center justify-center text-slate-400">
        {t('home.noData')}
      </div>
    )
  }

  return (
    <div id="desktop-player-detail" className="h-full overflow-y-auto px-6 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
        >
          ← {t('common.back')}
        </button>
      </div>

      {/* 基础信息 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h2 className="text-lg font-semibold">{t('player.detail.title')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-400">{t('players.name')}</div>
            <div>{player.name ?? '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.id')}</div>
            <div>{player.playerId}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.first')}</div>
            <div>{player.firstEncounter ? new Date(player.firstEncounter).toLocaleDateString() : '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.last')}</div>
            <div>{player.lastEncounter ? new Date(player.lastEncounter).toLocaleDateString() : '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.encounterCount')}</div>
            <div>{player.encounterCount ?? (player.matchList?.length || 0)}</div>
          </div>
        </div>
      </section>

      {/* 曾用名列表 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.aliases')}</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {(player.nameList ?? []).length === 0 && <div className="text-slate-400">{t('home.noData')}</div>}
          {(player.nameList ?? []).map((name) => (
            <span key={name} className="rounded-full bg-slate-700/70 px-3 py-1">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* 遭遇统计 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.encounterStats')}</h3>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-400">{t('players.encounterCount')}</div>
            <div className="text-lg font-semibold">{player.encounterCount}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.first')}</div>
            <div>{player.firstEncounter ? new Date(player.firstEncounter).toLocaleDateString() : '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.last')}</div>
            <div>{player.lastEncounter ? new Date(player.lastEncounter).toLocaleDateString() : '--'}</div>
          </div>
        </div>
      </section>

      {/* 队友/对手统计 */}
      {stats && (
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <h3 className="text-lg font-semibold">{t('player.detail.teammateOpponentStats')}</h3>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-green-400">{t('player.detail.teammate')}</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">{t('player.detail.games')}: </span>
                  <span>{stats.teammateGames}</span>
                </div>
                <div>
                  <span className="text-slate-400">{t('player.detail.winRate')}: </span>
                  <span>
                    {stats.teammateGames > 0
                      ? ((stats.teammateWins / stats.teammateGames) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold text-red-400">{t('player.detail.opponent')}</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">{t('player.detail.games')}: </span>
                  <span>{stats.opponentGames}</span>
                </div>
                <div>
                  <span className="text-slate-400">{t('player.detail.winRate')}: </span>
                  <span>
                    {stats.opponentGames > 0
                      ? ((stats.opponentWins / stats.opponentGames) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 英雄统计 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.heroes')}</h3>
        <div className="mt-2 space-y-2">
          {(player.heroList ?? []).length === 0 && <div className="text-slate-400">{t('home.noData')}</div>}
          {(player.heroList ?? [])
            .sort((a, b) => b.totalGames - a.totalGames)
            .slice(0, 10)
            .map((heroStat) => {
              const winRate =
                heroStat.totalGames > 0 ? ((heroStat.wins / heroStat.totalGames) * 100).toFixed(1) : '0.0'
              return (
                <div
                  key={heroStat.hero}
                  className="flex items-center justify-between rounded bg-slate-700/70 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{heroStat.hero}</span>
                  <div className="flex gap-4 text-slate-400">
                    <span>
                      {heroStat.totalGames} {t('player.detail.games')}
                    </span>
                    <span>{heroStat.wins}W</span>
                    <span>{winRate}%</span>
                  </div>
                </div>
              )
            })}
        </div>
      </section>

      {/* 位置统计 */}
      {stats && stats.roleStats.length > 0 && (
        <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <h3 className="text-lg font-semibold">{t('player.detail.roleStats')}</h3>
          <div className="mt-2 space-y-2">
            {stats.roleStats.map((roleStat) => {
              const winRate = roleStat.count > 0 ? ((roleStat.wins / roleStat.count) * 100).toFixed(1) : '0.0'
              return (
                <div
                  key={roleStat.role}
                  className="flex items-center justify-between rounded bg-slate-700/70 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{roleStat.role}</span>
                  <div className="flex gap-4 text-slate-400">
                    <span>
                      {roleStat.count} {t('player.detail.games')}
                    </span>
                    <span>{roleStat.wins}W</span>
                    <span>{winRate}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 遭遇比赛表 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.matchHistory')}</h3>
        <div className="mt-4">
          <DataTable<MatchRecord>
            columns={[
              { key: 'matchId', label: t('matches.matchId') },
              {
                key: 'gameMode',
                label: t('matches.gameMode'),
                render: (row) => row.gameMode?.game_mode ?? row.gameMode?.lobby_type ?? '--',
              },
              {
                key: 'updatedAt',
                label: t('matches.updatedAt'),
                render: (row) => new Date(row.updatedAt).toLocaleString(),
              },
              {
                key: 'winner',
                label: t('matches.result'),
                render: (row) => formatMatchResult(row, t),
              },
            ]}
            data={matches.sort((a, b) => b.updatedAt - a.updatedAt)}
            emptyText={t('home.noData')}
            onRowClick={(row) => navigate(`/matches/${row.matchId}`)}
          />
        </div>
      </section>

      {/* 评分数据列表 */}
      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.comments')}</h3>
        <div className="mt-4">
          <DataTable<CommentRecord>
            columns={[
              {
                key: 'updatedAt',
                label: t('comments.updatedAt'),
                render: (row) => new Date(row.updatedAt).toLocaleString(),
              },
              {
                key: 'matchId',
                label: t('comments.matchId'),
                render: (row) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/matches/${row.matchId}`)
                    }}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {row.matchId}
                  </button>
                ),
              },
              { key: 'score', label: t('comments.score') },
              {
                key: 'comment',
                label: t('comments.comment'),
                render: (row) => (
                  <div className="max-w-md truncate" title={row.comment}>
                    {row.comment || '--'}
                  </div>
                ),
              },
            ]}
            data={comments.sort((a, b) => b.updatedAt - a.updatedAt)}
            emptyText={t('home.noData')}
          />
        </div>
      </section>
    </div>
  )
}

