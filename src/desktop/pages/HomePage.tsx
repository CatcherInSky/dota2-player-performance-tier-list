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
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../../shared/ui/tabs'
import { DataTable } from '../components/DataTable'
import { FilterCard, InputField } from '../components/FilterCard'
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
  const [local, setLocal] = useState(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => onChange({ ...local, page: 1 })
  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <InputField label={t('matches.matchId')} value={local.matchId ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, matchId: value }))} />
          <InputField label={t('matches.filters.mode')} value={local.gameMode ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, gameMode: value }))} />
          <InputField
            label={t('matches.filters.result')}
            value={local.winner ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, winner: value ? (value as MatchFilters['winner']) : undefined }))}
            placeholder="radiant / dire / none / unknown"
          />
          <InputField
            label={t('matches.filters.time')}
            type="datetime-local"
            value={local.startTime ? new Date(local.startTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, startTime: value ? new Date(value).getTime() : undefined }))}
          />
          <InputField
            label=""
            type="datetime-local"
            value={local.endTime ? new Date(local.endTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, endTime: value ? new Date(value).getTime() : undefined }))}
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
  const [local, setLocal] = useState(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => onChange({ ...local, page: 1 })
  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <InputField label={t('players.filters.keyword')} value={local.keyword ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, keyword: value }))} />
          <InputField label={t('players.filters.hero')} value={local.hero ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, hero: value }))} />
          <InputField
            label={t('players.filters.time')}
            type="datetime-local"
            value={local.startTime ? new Date(local.startTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, startTime: value ? new Date(value).getTime() : undefined }))}
          />
          <InputField
            label=""
            type="datetime-local"
            value={local.endTime ? new Date(local.endTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, endTime: value ? new Date(value).getTime() : undefined }))}
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
  const [local, setLocal] = useState(filters)

  useEffect(() => {
    setLocal(filters)
  }, [filters])

  const apply = () => onChange({ ...local, page: 1 })
  const reset = () => onChange({ page: 1, pageSize: filters.pageSize })

  return (
    <FilterCard
      inputs={
        <>
          <InputField label={t('comments.filters.player')} value={local.playerId ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, playerId: value }))} />
          <InputField label={t('comments.filters.match')} value={local.matchId ?? ''} onChange={(value) => setLocal((prev) => ({ ...prev, matchId: value }))} />
          <InputField
            label={t('comments.filters.score')}
            value={local.score?.toString() ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, score: value ? Number(value) : undefined }))}
          />
          <InputField
            label={t('comments.filters.time')}
            type="datetime-local"
            value={local.startTime ? new Date(local.startTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, startTime: value ? new Date(value).getTime() : undefined }))}
          />
          <InputField
            label=""
            type="datetime-local"
            value={local.endTime ? new Date(local.endTime).toISOString().slice(0, 16) : ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, endTime: value ? new Date(value).getTime() : undefined }))}
          />
        </>
      }
      onApply={apply}
      onReset={reset}
    />
  )
}

