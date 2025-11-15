import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

export function HomePage({ api }: HomePageProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<HomeTab>('matches')
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({ page: 1, pageSize: 20 })
  const [playerFilters, setPlayerFilters] = useState<PlayerFilters>({ page: 1, pageSize: 20 })
  const [commentFilters, setCommentFilters] = useState<CommentFilters>({ page: 1, pageSize: 20 })
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
        <TabsRoot value={activeTab} onValueChange={(value: string) => setActiveTab(value as HomeTab)}>
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
            <CommentsTable filters={commentFilters} comments={comments} onFiltersChange={setCommentFilters} />
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

  return (
    <div className="space-y-4">
      <MatchFiltersForm filters={filters} onChange={onFiltersChange} />
      <DataTable<MatchRecord>
        columns={[
          { key: 'matchId', label: t('matches.matchId') },
          { key: 'gameMode', label: t('matches.gameMode'), render: (row) => row.gameMode?.game_mode ?? '--' },
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
  const { t } = useI18n()

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
            render: (row) => (row.firstEncounter ? new Date(row.firstEncounter).toLocaleString() : '--'),
          },
          {
            key: 'lastEncounter',
            label: t('players.last'),
            render: (row) => (row.lastEncounter ? new Date(row.lastEncounter).toLocaleString() : '--'),
          },
          {
            key: 'encounterCount',
            label: t('players.encounterCount'),
          },
          {
            key: 'averageScore',
            label: t('players.averageScore'),
            render: (row) => (row.averageScore ? row.averageScore.toFixed(1) : '--'),
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
          { key: 'playerName', label: t('comments.playerName') },
          { key: 'matchId', label: t('comments.matchId') },
          { key: 'score', label: t('comments.score') },
          { key: 'comment', label: t('comments.comment') },
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
  const [local, setLocal] = useState<MatchFilters & { dateRange?: { start?: Date; end?: Date } }>(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => {
    // Convert date range to timestamps (start of day for start, end of day for end)
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
  const [local, setLocal] = useState<PlayerFilters & { matchId?: string }>(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => onChange({ ...local, page: 1 })
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
  const [local, setLocal] = useState<CommentFilters & { dateRange?: { start?: Date; end?: Date }; comment?: string }>(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => {
    // Convert date range to timestamps (start of day for start, end of day for end)
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
            value={local.score?.toString() ?? ''}
            onValueChange={(value) => setLocal((prev) => ({ ...prev, score: value ? Number(value) : undefined }))}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase text-slate-400">{t('comments.filters.score')}</label>
              <SelectTrigger>
                {local.score ? `${local.score}星` : '选择评分'}
              </SelectTrigger>
              <SelectContent>
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

