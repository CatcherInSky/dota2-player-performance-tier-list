import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useI18n } from '../../shared/i18n'
import type { BackgroundApi, PlayerWithStats } from '../../shared/types/api'
import type { CommentRecord } from '../../shared/types/database'

interface PlayerDetailPageProps {
  api: BackgroundApi | undefined
}

export function PlayerDetailPage({ api }: PlayerDetailPageProps) {
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
      <div id="desktop-player-detail-empty" className="flex h-full items-center justify-center text-slate-400">
        {t('home.noData')}
      </div>
    )
  }

  return (
    <div id="desktop-player-detail" className="h-full overflow-y-auto px-6 py-4 space-y-6">
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

