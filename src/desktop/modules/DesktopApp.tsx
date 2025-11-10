import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type {
  CommentFilters,
  CommentWithPlayer,
  MatchFilters,
  PaginatedResult,
  PlayerFilters,
  PlayerWithStats,
} from '../../shared/types/api'
import type { CommentRecord, MatchRecord } from '../../shared/types/database'
import type { BackgroundApi } from '../../shared/api/background'
import { useBackgroundApi } from '../../shared/hooks/useBackgroundApi'
import { useI18n } from '../../shared/i18n'
import type { GlobalMatchData } from '../../shared/types/dota2'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../../shared/ui/tabs'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from '../../shared/ui/dialog'

type MatchTab = 'matches' | 'players' | 'comments'

export function DesktopApp() {
  return (
    <BrowserRouter>
      <DesktopShell />
    </BrowserRouter>
  )
}

function DesktopShell() {
  const api = useBackgroundApi()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const [isSettingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (event.button === 3) {
        event.preventDefault()
        navigate(-1)
      }
      if (event.button === 4) {
        event.preventDefault()
        navigate(1)
      }
    }

    window.addEventListener('mouseup', handler)
    return () => {
      window.removeEventListener('mouseup', handler)
    }
  }, [navigate])

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-50">
      <header className="flex items-center gap-2 border-b border-slate-700 px-4 py-2">
        <button className="btn" onClick={() => navigate(-1)}>
          {t('nav.back')}
        </button>
        <button className="btn" onClick={() => navigate(1)}>
          {t('nav.forward')}
        </button>
        <button className="btn" onClick={() => navigate('/')}>
          {t('nav.home')}
        </button>
        <div className="flex-1 text-center text-sm text-slate-400">{location.pathname}</div>
        <button className="btn" onClick={() => setSettingsOpen(true)}>
          {t('nav.settings')}
        </button>
      </header>
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage api={api} />} />
          <Route path="/matches/:matchId" element={<MatchDetailPage api={api} />} />
          <Route path="/players/:playerId" element={<PlayerDetailPage api={api} />} />
        </Routes>
      </main>
      <SettingsDialog api={api} open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

function HomePage({ api }: { api: BackgroundApi | undefined }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<MatchTab>('matches')
  const [matchFilters, setMatchFilters] = useState<MatchFilters>({ page: 1, pageSize: 20 })
  const [playerFilters, setPlayerFilters] = useState<PlayerFilters>({ page: 1, pageSize: 20 })
  const [commentFilters, setCommentFilters] = useState<CommentFilters>({ page: 1, pageSize: 20 })
  const [matches, setMatches] = useState<PaginatedResult<MatchRecord> | undefined>(undefined)
  const [players, setPlayers] = useState<PaginatedResult<PlayerWithStats> | undefined>(undefined)
  const [comments, setComments] = useState<PaginatedResult<CommentWithPlayer> | undefined>(undefined)

  useEffect(() => {
    if (!api) return
    let cancelled = false
    api.data.getMatches(matchFilters).then((result) => {
      if (!cancelled) setMatches(result)
    })
    return () => {
      cancelled = true
    }
  }, [api, matchFilters])

  useEffect(() => {
    if (!api) return
    let cancelled = false
    api.data.getPlayers(playerFilters).then((result) => {
      if (!cancelled) setPlayers(result)
    })
    return () => {
      cancelled = true
    }
  }, [api, playerFilters])

  useEffect(() => {
    if (!api) return
    let cancelled = false
    api.data.getComments(commentFilters).then((result) => {
      if (!cancelled) setComments(result)
    })
    return () => {
      cancelled = true
    }
  }, [api, commentFilters])

  const renderMatches = () => (
    <div className="space-y-4">
      <MatchFiltersForm filters={matchFilters} onChange={setMatchFilters} />
      <DataTable
        columns={[
          { key: 'matchId', label: t('matches.matchId') },
          { key: 'gameMode', label: t('matches.gameMode'), render: (row) => row.gameMode?.game_mode ?? '--' },
          {
            key: 'updatedAt',
            label: t('matches.updatedAt'),
            render: (row) => new Date(row.updatedAt).toLocaleString(),
          },
          {
            key: 'win',
            label: t('matches.result'),
            render: (row) =>
              row.win === true ? t('matches.win') : row.win === false ? t('matches.lose') : t('matches.unknown'),
          },
        ]}
        data={matches?.items ?? []}
        emptyText={t('home.noData')}
        onRowClick={(row) => navigate(`/matches/${row.matchId}`)}
        pagination={matches}
        onPageChange={(page) => setMatchFilters((prev) => ({ ...prev, page }))}
      />
    </div>
  )

  const renderPlayers = () => (
    <div className="space-y-4">
      <PlayerFiltersForm filters={playerFilters} onChange={setPlayerFilters} />
      <DataTable
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
        onRowClick={(row) => navigate(`/players/${row.playerId}`)}
        pagination={players}
        onPageChange={(page) => setPlayerFilters((prev) => ({ ...prev, page }))}
      />
    </div>
  )

  const renderComments = () => (
    <div className="space-y-4">
      <CommentFiltersForm filters={commentFilters} onChange={setCommentFilters} />
      <DataTable
        columns={[
          { key: 'updatedAt', label: t('comments.updatedAt'), render: (row) => new Date(row.updatedAt).toLocaleString() },
          { key: 'playerName', label: t('comments.playerName') },
          { key: 'matchId', label: t('comments.matchId') },
          { key: 'score', label: t('comments.score') },
          { key: 'comment', label: t('comments.comment') },
        ]}
        data={comments?.items ?? []}
        emptyText={t('home.noData')}
        pagination={comments}
        onPageChange={(page) => setCommentFilters((prev) => ({ ...prev, page }))}
      />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <TabsRoot value={activeTab} onValueChange={(value: string) => setActiveTab(value as MatchTab)}>
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
        <TabsContent value="matches">{renderMatches()}</TabsContent>
        <TabsContent value="players">{renderPlayers()}</TabsContent>
        <TabsContent value="comments">{renderComments()}</TabsContent>
      </TabsRoot>
    </div>
  )
}

function MatchDetailPage({ api }: { api: BackgroundApi | undefined }) {
  const { matchId = '' } = useParams()
  const { t } = useI18n()
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [state, setState] = useState<GlobalMatchData | null>(null)

  useEffect(() => {
    if (!api || !matchId) return
    let cancelled = false
    api.data.getMatches({ matchId }).then((result) => {
      if (!cancelled) {
        setMatch(result.items[0] ?? null)
      }
    })
    api.match.getCurrent().then((current) => {
      if (!cancelled) setState(current.state)
    })
    return () => {
      cancelled = true
    }
  }, [api, matchId])

  if (!match) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        {t('home.noData')}
      </div>
    )
  }

  const players = match.players ?? state?.roster.players ?? []

  return (
    <div className="h-full overflow-y-auto px-6 py-4 space-y-6">
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
              {match.teamScore
                ? `${match.teamScore.radiant ?? 0} : ${match.teamScore.dire ?? 0}`
                : t('matches.unknown')}
            </div>
          </div>
          <div>
            <div className="text-slate-400">{t('match.detail.winner')}</div>
            <div>
              {match.win === true ? t('matches.win') : match.win === false ? t('matches.lose') : t('matches.unknown')}
            </div>
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

function PlayerDetailPage({ api }: { api: BackgroundApi | undefined }) {
  const { playerId = '' } = useParams()
  const { t } = useI18n()
  const [player, setPlayer] = useState<PlayerWithStats | null>(null)
  const [comments, setComments] = useState<CommentRecord[]>([])

  useEffect(() => {
    if (!api || !playerId) return
    let cancelled = false
    api.data.getPlayerHistory(playerId).then(({ player, comments }) => {
      if (!cancelled) {
        setPlayer(player)
        setComments(comments)
      }
    })
    return () => {
      cancelled = true
    }
  }, [api, playerId])

  if (!player) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        {t('home.noData')}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-4 space-y-6">
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
            <div>{player.firstEncounter ? new Date(player.firstEncounter).toLocaleString() : '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.last')}</div>
            <div>{player.lastEncounter ? new Date(player.lastEncounter).toLocaleString() : '--'}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.encounterCount')}</div>
            <div>{player.encounterCount}</div>
          </div>
          <div>
            <div className="text-slate-400">{t('players.averageScore')}</div>
            <div>{player.averageScore ? player.averageScore.toFixed(1) : '--'}</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.aliases')}</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {(player.nameList ?? []).map((name) => (
            <span key={name} className="rounded-full bg-slate-700/70 px-3 py-1">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.heroes')}</h3>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {(player.heroList ?? []).map((hero) => (
            <span key={hero} className="rounded-full bg-slate-700/70 px-3 py-1">
              {hero}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <h3 className="text-lg font-semibold">{t('player.detail.comments')}</h3>
        <div className="mt-4 space-y-3">
          {comments.length === 0 && <div className="text-slate-400">{t('home.noData')}</div>}
          {comments.map((comment) => (
            <div key={comment.uuid} className="rounded border border-slate-700/60 bg-slate-900/60 p-3">
              <div className="flex justify-between text-sm text-slate-300">
                <span>
                  {t('comments.matchId')}: {comment.matchId}
                </span>
                <span>{new Date(comment.updatedAt).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-sm">⭐ {comment.score}</div>
              {comment.comment && <p className="mt-2 text-sm">{comment.comment}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyText: string
  onRowClick?: (row: T) => void
  pagination?: PaginatedResult<T>
  onPageChange?: (page: number) => void
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyText,
  onRowClick,
  pagination,
  onPageChange,
}: DataTableProps<T>) {
  const { t } = useI18n()
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/60 shadow">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800/80">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-400" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
          {data.map((row, index) => (
            <tr
              key={index}
              className={onRowClick ? 'cursor-pointer hover:bg-slate-700/40' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-2 text-sm">
                  {column.render ? column.render(row) : (row[column.key as keyof T] as React.ReactNode) ?? '--'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && onPageChange && (
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900/60 px-4 py-2 text-sm">
          <div>
            {pagination.total === 0
              ? ''
              : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )} / ${pagination.total}`}
          </div>
          <div className="flex gap-2">
            <button
              className="btn"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))}
            >
              {t('nav.back')}
            </button>
            <button
              className="btn"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              {t('nav.forward')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MatchFiltersForm({
  filters,
  onChange,
}: {
  filters: MatchFilters
  onChange: (filters: MatchFilters) => void
}) {
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
          <InputField
            label={t('matches.matchId')}
            value={local.matchId ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, matchId: value }))}
          />
          <InputField
            label={t('matches.filters.mode')}
            value={local.gameMode ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, gameMode: value }))}
          />
          <InputField
            label={t('matches.filters.result')}
            value={local.win ?? ''}
            onChange={(value) =>
              setLocal((prev) => ({ ...prev, win: value ? (value as MatchFilters['win']) : undefined }))
            }
            placeholder="win / lose / unknown"
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

function PlayerFiltersForm({
  filters,
  onChange,
}: {
  filters: PlayerFilters
  onChange: (filters: PlayerFilters) => void
}) {
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
          <InputField
            label={t('players.filters.keyword')}
            value={local.keyword ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, keyword: value }))}
          />
          <InputField
            label={t('players.filters.hero')}
            value={local.hero ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, hero: value }))}
          />
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

function CommentFiltersForm({
  filters,
  onChange,
}: {
  filters: CommentFilters
  onChange: (filters: CommentFilters) => void
}) {
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
          <InputField
            label={t('comments.filters.player')}
            value={local.playerId ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, playerId: value }))}
          />
          <InputField
            label={t('comments.filters.match')}
            value={local.matchId ?? ''}
            onChange={(value) => setLocal((prev) => ({ ...prev, matchId: value }))}
          />
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

function FilterCard({
  inputs,
  onApply,
  onReset,
}: {
  inputs: React.ReactNode
  onApply: () => void
  onReset: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">{inputs}</div>
      <div className="mt-4 flex gap-2">
        <button className="btn" onClick={onApply}>
          {t('home.search')}
        </button>
        <button className="btn-secondary" onClick={onReset}>
          {t('home.reset')}
        </button>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs uppercase text-slate-400">{label}</span>}
      <input
        type={type}
        className="rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SettingsDialog({
  api,
  open,
  onOpenChange,
}: {
  api: BackgroundApi | undefined
  open: boolean
  onOpenChange: (state: boolean) => void
}) {
  const { t, language, setLanguage, ratingLabels, settings } = useI18n()
  const [draftLabels, setDraftLabels] = useState(ratingLabels)
  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setDraftLabels(ratingLabels)
  }, [ratingLabels])

  const handleSave = async () => {
    if (!api) return
    await api.settings.update({ ratingLabels: draftLabels })
    setStatus(t('toast.saved'))
  }

  const handleExport = async () => {
    if (!api) return
    const data = await api.settings.export()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dota2-player-data-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!api || !importText) return
    try {
      const parsed = JSON.parse(importText)
      await api.settings.import(parsed)
      setStatus(t('settings.import.success'))
      setImportText('')
    } catch (error) {
      console.error(error)
      setStatus(t('toast.failed'))
    }
  }

  const handleClear = async () => {
    if (!api) return
    await api.settings.clear()
    setStatus(t('toast.saved'))
  }

  const ratingInputs = useMemo(() => {
    return (Object.entries(draftLabels) as Array<[string, string]>).map(([key, value]) => (
      <InputField
        key={key}
        label={t('settings.rating.label').replace('{star}', key)}
        value={value}
        onChange={(next) =>
          setDraftLabels((prev) => ({
            ...prev,
            [key]: next,
          }))
        }
      />
    ))
  }, [draftLabels, t])

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-slate-950/70 backdrop-blur" />
        <DialogContent className="fixed inset-0 m-auto flex h-[80vh] w-[min(720px,90vw)] flex-col rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-50 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{t('settings.title')}</DialogTitle>
            <DialogClose className="btn-secondary">{t('ingame.close')}</DialogClose>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.language')}</h3>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={language === 'zh-CN'}
                    onChange={() => setLanguage('zh-CN')}
                  />
                  {t('settings.language.zh')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={language === 'en-US'}
                    onChange={() => setLanguage('en-US')}
                  />
                  {t('settings.language.en')}
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.ratingLabels')}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{ratingInputs}</div>
              <div className="flex gap-2">
                <button className="btn" onClick={handleSave}>
                  {t('settings.save')}
                </button>
                <button className="btn-secondary" onClick={() => setDraftLabels(settings?.ratingLabels ?? ratingLabels)}>
                  {t('settings.cancel')}
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.export')}</h3>
              <button className="btn" onClick={handleExport}>
                {t('settings.export')}
              </button>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.import')}</h3>
              <textarea
                className="h-40 w-full rounded border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm focus:outline-none"
                placeholder={t('settings.import.placeholder')}
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
              />
              <button className="btn" onClick={handleImport}>
                {t('settings.import.apply')}
              </button>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-slate-300">{t('settings.clear')}</h3>
              <button className="btn-destructive" onClick={handleClear}>
                {t('settings.clear')}
              </button>
            </section>
          </div>
          {status && <div className="mt-4 text-center text-sm text-slate-300">{status}</div>}
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  )
}

