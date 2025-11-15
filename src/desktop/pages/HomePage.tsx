import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useBackgroundEvents } from '../../shared/hooks/useBackgroundEvents'
import { useI18n } from '../../shared/i18n'
import type {
  BackgroundApi,
  CommentFilters,
  CommentWithPlayer,
  MatchFilters,
  PaginatedResult,
  PlayerFilters,
  PlayerWithStats,
} from '../../shared/types/api'
import type { MatchRecord } from '../../shared/types/database'
import { Dota2GameState } from '../../shared/types/dota2'
import { Dota2Team } from '../../shared/types/dota2'
import { DatePicker } from '../../shared/ui/date-picker'
import { Input } from '../../shared/ui/input'
import { SelectContent, SelectItem, SelectRoot, SelectTrigger } from '../../shared/ui/select'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../../shared/ui/tabs'
import { DataTable } from '../components/DataTable'
import { FilterCard } from '../components/FilterCard'
import { formatMatchResult } from '../utils/match'

type HomeTab = 'matches' | 'players' | 'comments'

interface HomePageProps {
  api: BackgroundApi | undefined
}

/**
 * HomePage - 主页组件
 * 包含三个标签页：比赛表、玩家表、评价表
 * 支持筛选、分页、实时刷新等功能
 */
export function HomePage({ api }: HomePageProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<HomeTab>(() => {
    const tab = searchParams.get('tab')
    return (tab === 'matches' || tab === 'players' || tab === 'comments' ? tab : 'matches') as HomeTab
  })
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({ page: 1, pageSize: 20 })
  const [playerFilters, setPlayerFilters] = useState<PlayerFilters>({ page: 1, pageSize: 20 })
  const [commentFilters, setCommentFilters] = useState<CommentFilters>(() => {
    // 初始化时从URL读取playerId参数
    const urlParams = new URLSearchParams(window.location.search)
    const playerIdFromUrl = urlParams.get('playerId')
    return { page: 1, pageSize: 20, ...(playerIdFromUrl ? { playerId: playerIdFromUrl } : {}) }
  })
  const [matches, setMatches] = useState<PaginatedResult<MatchRecord> | undefined>(undefined)
  const [players, setPlayers] = useState<PaginatedResult<PlayerWithStats> | undefined>(undefined)
  const [comments, setComments] = useState<PaginatedResult<CommentWithPlayer> | undefined>(undefined)

  const reloadMatches = useCallback(() => {
    if (!api) return
    api.data.getMatches(matchFilters).then((result) => setMatches(result))
  }, [api, matchFilters])

  const reloadPlayers = useCallback(() => {
    if (!api) return
    api.data.getPlayers(playerFilters).then((result) => setPlayers(result))
  }, [api, playerFilters])

  const reloadComments = useCallback(() => {
    if (!api) return
    api.data.getComments(commentFilters).then((result) => setComments(result))
  }, [api, commentFilters])

  useEffect(() => {
    reloadMatches()
  }, [reloadMatches])

  useEffect(() => {
    reloadPlayers()
  }, [reloadPlayers])

  useEffect(() => {
    reloadComments()
  }, [reloadComments])

  // 监听URL参数变化，更新评论筛选条件
  useEffect(() => {
    const playerIdFromUrl = searchParams.get('playerId')
    if (playerIdFromUrl && commentFilters.playerId !== playerIdFromUrl) {
      setCommentFilters((prev) => ({ ...prev, playerId: playerIdFromUrl, page: 1 }))
    } else if (!playerIdFromUrl && commentFilters.playerId) {
      // 如果URL中没有playerId但筛选条件中有，清除它
      setCommentFilters((prev) => {
        const { playerId, ...rest } = prev
        return { ...rest, page: 1 }
      })
    }
  }, [searchParams])

  useBackgroundEvents(api, 'match:start', () => {
    reloadMatches()
    reloadPlayers()
  })

  useBackgroundEvents(api, 'match:end', () => {
    reloadMatches()
    reloadPlayers()
    reloadComments()
  })

  return (
    <div id="desktop-home" className="h-full overflow-y-auto px-6 py-4">
      <div id="desktop-home-tabs">
        <TabsRoot
          value={activeTab}
          onValueChange={(value: string) => {
            const tab = value as HomeTab
            setActiveTab(tab)
            setSearchParams({ tab })
          }}
        >
          <TabsList className="mb-4 flex gap-2 border-b border-slate-700 pb-2">
            <TabsTrigger className="tab-trigger" value="matches">
              {t('home.matches')}
            </TabsTrigger>
            <TabsTrigger className="tab-trigger" value="players">
              {t('home.players')}
            </TabsTrigger>
            <TabsTrigger className="tab-trigger" value="comments">
              {t('home.comments')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="matches">
            <MatchesTable
              filters={matchFilters}
              matches={matches}
              onFiltersChange={setMatchFilters}
              onSelect={(row) => navigate(`/matches/${row.matchId}`)}
            />
          </TabsContent>
          <TabsContent value="players">
            <PlayersTable
              filters={playerFilters}
              players={players}
              onFiltersChange={setPlayerFilters}
              onSelect={(row) => navigate(`/players/${row.playerId}`)}
            />
          </TabsContent>
          <TabsContent value="comments">
            <CommentsTable
              filters={commentFilters}
              comments={comments}
              onFiltersChange={(filters) => {
                setCommentFilters(filters)
                // 如果设置了playerId，更新URL参数
                if (filters.playerId) {
                  setSearchParams({ tab: 'comments', playerId: filters.playerId })
                } else {
                  setSearchParams({ tab: 'comments' })
                }
              }}
            />
          </TabsContent>
        </TabsRoot>
      </div>
    </div>
  )
}

interface MatchesTableProps {
  filters: MatchFilters
  matches: PaginatedResult<MatchRecord> | undefined
  onFiltersChange: (filters: MatchFilters) => void
  onSelect: (row: MatchRecord) => void
}

function MatchesTable({ filters, matches, onFiltersChange, onSelect }: MatchesTableProps) {
  const { t } = useI18n()

  const getPlayerHero = (match: MatchRecord) => {
    if (!match.playerId || !match.players) return null
    const player = match.players.find((p) => p.steamId === match.playerId)
    return player?.hero ?? null
  }

  const isSpectating = (match: MatchRecord) => {
    return match.gameState === Dota2GameState.SPECTATING
  }

  return (
    <div className="space-y-4">
      <MatchFiltersForm filters={filters} onChange={onFiltersChange} />
      <DataTable<MatchRecord>
        columns={[
          { key: 'matchId', label: t('matches.matchId') },
          {
            key: 'gameMode',
            label: t('matches.gameMode'),
            render: (row) => row.gameMode?.game_mode ?? row.gameMode?.lobby_type ?? '--',
          },
          {
            key: 'gameState',
            label: t('matches.spectating'),
            render: (row) => (isSpectating(row) ? t('matches.yes') : t('matches.no')),
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
          {
            key: 'hero',
            label: t('matches.hero'),
            render: (row) => {
              const hero = getPlayerHero(row)
              return hero ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-sm">{hero}</span>
                </span>
              ) : (
                '--'
              )
            },
          },
        ]}
        data={matches?.items ?? []}
        emptyText={t('home.noData')}
        onRowClick={onSelect}
        pagination={matches}
        onPageChange={(page: number) => onFiltersChange({ ...filters, page })}
        onPageSizeChange={(pageSize: number) => onFiltersChange({ ...filters, page: 1, pageSize })}
      />
    </div>
  )
}

interface PlayersTableProps {
  filters: PlayerFilters
  players: PaginatedResult<PlayerWithStats> | undefined
  onFiltersChange: (filters: PlayerFilters) => void
  onSelect: (row: PlayerWithStats) => void
}

function PlayersTable({ filters, players, onFiltersChange, onSelect }: PlayersTableProps) {
  const { t, ratingLabels } = useI18n()
  const navigate = useNavigate()

  const getLatestMatchId = (player: PlayerWithStats) => {
    if (!player.matchList || player.matchList.length === 0) return '--'
    const latest = player.matchList[player.matchList.length - 1]
    return latest.matchId
  }

  const getAverageScoreLabel = (averageScore: number | null) => {
    if (averageScore === null || averageScore === undefined) return '--'
    const rounded = Math.round(averageScore)
    return ratingLabels[rounded as 1 | 2 | 3 | 4 | 5] ?? '--'
  }

  const handleAverageScoreClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation()
    navigate(`/?tab=comments&playerId=${playerId}`)
  }

  const handleLatestMatchIdClick = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation()
    navigate(`/matches/${matchId}`)
  }

  return (
    <div className="space-y-4">
      <PlayerFiltersForm filters={filters} onChange={onFiltersChange} />
      <DataTable<PlayerWithStats>
        columns={[
          { key: 'name', label: t('players.name') },
          { key: 'playerId', label: t('players.id') },
          {
            key: 'firstEncounter',
            label: t('players.first'),
            render: (row) => (row.firstEncounter ? new Date(row.firstEncounter).toLocaleDateString() : '--'),
          },
          {
            key: 'lastEncounter',
            label: t('players.last'),
            render: (row) => (row.lastEncounter ? new Date(row.lastEncounter).toLocaleDateString() : '--'),
          },
          {
            key: 'encounterCount',
            label: t('players.encounterCount'),
          },
          {
            key: 'teammateGames',
            label: t('players.teammateGames'),
            render: (row) => {
              const games = row.teammateGames ?? 0
              const winRate = row.teammateWinRate
                ? `${row.teammateWinRate.toFixed(1)}%`
                : games > 0
                  ? '0.0%'
                  : '--'
              return games > 0 ? `${games} (${winRate})` : '--'
            },
          },
          {
            key: 'opponentGames',
            label: t('players.opponentGames'),
            render: (row) => {
              const games = row.opponentGames ?? 0
              const winRate = row.opponentWinRate
                ? `${row.opponentWinRate.toFixed(1)}%`
                : games > 0
                  ? '0.0%'
                  : '--'
              return games > 0 ? `${games} (${winRate})` : '--'
            },
          },
          {
            key: 'averageScore',
            label: t('players.averageScore'),
            render: (row) => {
              const label = getAverageScoreLabel(row.averageScore)
              if (label === '--') return '--'
              return (
                <button
                  type="button"
                  onClick={(e) => handleAverageScoreClick(e, row.playerId)}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {label}
                </button>
              )
            },
          },
          {
            key: 'latestMatchId',
            label: t('players.latestMatchId'),
            render: (row) => {
              const matchId = getLatestMatchId(row)
              if (matchId === '--') return '--'
              return (
                <button
                  type="button"
                  onClick={(e) => handleLatestMatchIdClick(e, matchId)}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {matchId}
                </button>
              )
            },
          },
        ]}
        data={players?.items ?? []}
        emptyText={t('home.noData')}
        onRowClick={onSelect}
        pagination={players}
        onPageChange={(page: number) => onFiltersChange({ ...filters, page })}
        onPageSizeChange={(pageSize: number) => onFiltersChange({ ...filters, page: 1, pageSize })}
      />
    </div>
  )
}

interface CommentsTableProps {
  filters: CommentFilters
  comments: PaginatedResult<CommentWithPlayer> | undefined
  onFiltersChange: (filters: CommentFilters) => void
}

function CommentsTable({ filters, comments, onFiltersChange }: CommentsTableProps) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const handlePlayerNameClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation()
    navigate(`/players/${playerId}`)
  }

  const handleMatchIdClick = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation()
    navigate(`/matches/${matchId}`)
  }

  return (
    <div className="space-y-4">
      <CommentFiltersForm filters={filters} onChange={onFiltersChange} />
      <DataTable<CommentWithPlayer>
        columns={[
          {
            key: 'updatedAt',
            label: t('comments.updatedAt'),
            render: (row) => new Date(row.updatedAt).toLocaleString(),
          },
          {
            key: 'playerName',
            label: t('comments.playerName'),
            render: (row) => (
              <button
                type="button"
                onClick={(e) => handlePlayerNameClick(e, row.playerId)}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {row.playerName ?? row.playerId}
              </button>
            ),
          },
          {
            key: 'matchId',
            label: t('comments.matchId'),
            render: (row) => (
              <button
                type="button"
                onClick={(e) => handleMatchIdClick(e, row.matchId)}
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
        data={comments?.items ?? []}
        emptyText={t('home.noData')}
        pagination={comments}
        onPageChange={(page: number) => onFiltersChange({ ...filters, page })}
        onPageSizeChange={(pageSize: number) => onFiltersChange({ ...filters, page: 1, pageSize })}
      />
    </div>
  )
}

interface MatchFiltersFormProps {
  filters: MatchFilters
  onChange: (filters: MatchFilters) => void
}

function MatchFiltersForm({ filters, onChange }: MatchFiltersFormProps) {
  const { t } = useI18n()
  const [local, setLocal] = useState<
    MatchFilters & {
      dateRange?: { start?: Date; end?: Date }
      gameMode?: string
      winner?: Dota2Team | 'unknown' | 'all'
      gameState?: Dota2GameState | 'all'
    }
  >(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => {
    let startTime = local.startTime
    let endTime = local.endTime

    if (local.dateRange?.start) {
      const start = new Date(local.dateRange.start)
      start.setHours(0, 0, 0, 0)
      startTime = start.getTime()
    }

    if (local.dateRange?.end) {
      const end = new Date(local.dateRange.end)
      end.setHours(23, 59, 59, 999)
      endTime = end.getTime()
    }

    const newFilters: MatchFilters = {
      ...local,
      startTime,
      endTime,
      page: 1,
      gameMode: local.gameMode === 'all' ? undefined : local.gameMode,
      winner: (local.winner as string) === 'all' ? undefined : (local.winner as Dota2Team | 'unknown' | undefined),
      gameState: (local.gameState as string) === 'all' ? undefined : (local.gameState as Dota2GameState | undefined),
    }

    onChange(newFilters)
  }

  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('matches.matchId')}</label>
            <Input
              value={local.matchId ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, matchId: e.target.value }))}
              placeholder={t('matches.matchId')}
            />
          </div>
          <DatePicker
            label={t('matches.filters.time')}
            mode="range"
            value={{
              start: local.dateRange?.start,
              end: local.dateRange?.end,
            }}
            onChange={(dateRange) => setLocal((prev) => ({ ...prev, dateRange }))}
            placeholder={{ start: 'mm/dd/yyyy', end: 'mm/dd/yyyy' }}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('matches.gameMode')}</label>
            <Input
              value={local.gameMode ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, gameMode: e.target.value }))}
              placeholder={t('matches.gameMode')}
            />
          </div>
          <SelectRoot
            value={local.winner ?? 'all'}
            onValueChange={(value) =>
              setLocal((prev) => ({
                ...prev,
                winner: value === 'all' ? undefined : (value as Dota2Team | 'unknown'),
              }))
            }
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-slate-400">{t('matches.result')}</label>
              <SelectTrigger>
                {local.winner === 'unknown'
                  ? t('matches.unknown')
                  : local.winner
                    ? t(`matches.winner.${local.winner}`)
                    : t('matches.all')}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('matches.all')}</SelectItem>
                <SelectItem value="unknown">{t('matches.unknown')}</SelectItem>
                <SelectItem value={Dota2Team.RADIANT}>{t('matches.winner.radiant')}</SelectItem>
                <SelectItem value={Dota2Team.DIRE}>{t('matches.winner.dire')}</SelectItem>
              </SelectContent>
            </div>
          </SelectRoot>
          <SelectRoot
            value={local.gameState ?? 'all'}
            onValueChange={(value) =>
              setLocal((prev) => ({
                ...prev,
                gameState: value === 'all' ? undefined : (value as Dota2GameState),
              }))
            }
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-slate-400">{t('matches.spectating')}</label>
              <SelectTrigger>
                {local.gameState === Dota2GameState.SPECTATING
                  ? t('matches.yes')
                  : local.gameState === Dota2GameState.PLAYING
                    ? t('matches.no')
                    : t('matches.all')}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('matches.all')}</SelectItem>
                <SelectItem value={Dota2GameState.SPECTATING}>{t('matches.yes')}</SelectItem>
                <SelectItem value={Dota2GameState.PLAYING}>{t('matches.no')}</SelectItem>
              </SelectContent>
            </div>
          </SelectRoot>
        </>
      }
      onApply={apply}
      onReset={reset}
    />
  )
}

interface PlayerFiltersFormProps {
  filters: PlayerFilters
  onChange: (filters: PlayerFilters) => void
}

function PlayerFiltersForm({ filters, onChange }: PlayerFiltersFormProps) {
  const { t } = useI18n()
  const [local, setLocal] = useState<PlayerFilters & { dateRange?: { start?: Date; end?: Date } }>(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => {
    let startTime = local.startTime
    let endTime = local.endTime

    if (local.dateRange?.start) {
      const start = new Date(local.dateRange.start)
      start.setHours(0, 0, 0, 0)
      startTime = start.getTime()
    }

    if (local.dateRange?.end) {
      const end = new Date(local.dateRange.end)
      end.setHours(23, 59, 59, 999)
      endTime = end.getTime()
    }

    onChange({ ...local, startTime, endTime, page: 1 })
  }

  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('players.filters.keyword')}</label>
            <Input
              value={local.keyword ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, keyword: e.target.value }))}
              placeholder={t('players.filters.keyword')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('matches.matchId')}</label>
            <Input
              value={local.matchId ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, matchId: e.target.value }))}
              placeholder={t('matches.matchId')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('players.filters.hero')}</label>
            <Input
              value={local.hero ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, hero: e.target.value }))}
              placeholder={t('players.filters.hero')}
            />
          </div>
          <DatePicker
            label={t('players.filters.time')}
            mode="range"
            value={{
              start: local.dateRange?.start,
              end: local.dateRange?.end,
            }}
            onChange={(dateRange) => setLocal((prev) => ({ ...prev, dateRange }))}
            placeholder={{ start: 'mm/dd/yyyy', end: 'mm/dd/yyyy' }}
          />
        </>
      }
      onApply={apply}
      onReset={reset}
    />
  )
}

interface CommentFiltersFormProps {
  filters: CommentFilters
  onChange: (filters: CommentFilters) => void
}

function CommentFiltersForm({ filters, onChange }: CommentFiltersFormProps) {
  const { t } = useI18n()
  const [local, setLocal] = useState<CommentFilters & { dateRange?: { start?: Date; end?: Date }; comment?: string }>(
    filters,
  )

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => {
    let startTime = local.startTime
    let endTime = local.endTime

    if (local.dateRange?.start) {
      const start = new Date(local.dateRange.start)
      start.setHours(0, 0, 0, 0)
      startTime = start.getTime()
    }

    if (local.dateRange?.end) {
      const end = new Date(local.dateRange.end)
      end.setHours(23, 59, 59, 999)
      endTime = end.getTime()
    }

    onChange({ ...local, startTime, endTime, page: 1 })
  }

  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('comments.filters.player')}</label>
            <Input
              value={local.playerId ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, playerId: e.target.value }))}
              placeholder={t('comments.filters.player')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('comments.filters.match')}</label>
            <Input
              value={local.matchId ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, matchId: e.target.value }))}
              placeholder={t('comments.filters.match')}
            />
          </div>
          <DatePicker
            label={t('comments.filters.time')}
            mode="range"
            value={{
              start: local.dateRange?.start,
              end: local.dateRange?.end,
            }}
            onChange={(dateRange) => setLocal((prev) => ({ ...prev, dateRange }))}
            placeholder={{ start: 'mm/dd/yyyy', end: 'mm/dd/yyyy' }}
          />
          <SelectRoot
            value={local.score?.toString() ?? 'all'}
            onValueChange={(value) =>
              setLocal((prev) => ({ ...prev, score: value === 'all' ? undefined : Number(value) }))
            }
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-slate-400">{t('comments.filters.score')}</label>
              <SelectTrigger>{local.score ? `${local.score}星` : t('comments.all')}</SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('comments.all')}</SelectItem>
                {[1, 2, 3, 4, 5].map((score) => (
                  <SelectItem key={score} value={score.toString()}>
                    {score}星
                  </SelectItem>
                ))}
              </SelectContent>
            </div>
          </SelectRoot>
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase text-slate-400">{t('comments.comment')}</label>
            <Input
              value={local.comment ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder={t('comments.comment')}
            />
          </div>
        </>
      }
      onApply={apply}
      onReset={reset}
    />
  )
}

