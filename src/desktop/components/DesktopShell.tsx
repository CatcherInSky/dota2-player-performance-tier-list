import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { useBackgroundApi } from '../../shared/hooks/useBackgroundApi'
import { useI18n } from '../../shared/i18n'
import { HomePage } from '../pages/HomePage'
import { MatchDetailPage } from '../pages/MatchDetailPage'
import { PlayerDetailPage } from '../pages/PlayerDetailPage'
import { SettingsDialog } from './SettingsDialog'

export function DesktopShell() {
  const api = useBackgroundApi()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const [historyInfo, setHistoryInfo] = useState(() => getHistoryInfo())

  useEffect(() => {
    if (location.pathname === '/' || location.pathname.endsWith('/desktop.html')) {
      navigate('/home', { replace: true })
    }
  }, [location.pathname, navigate])

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

  useEffect(() => {
    const updateHistoryInfo = () => setHistoryInfo(getHistoryInfo())
    window.addEventListener('popstate', updateHistoryInfo)
    return () => {
      window.removeEventListener('popstate', updateHistoryInfo)
    }
  }, [])

  useEffect(() => {
    setHistoryInfo(getHistoryInfo())
  }, [location])

  const { canGoBack, canGoForward } = useMemo(() => {
    const idx = historyInfo.idx ?? 0
    const length = historyInfo.length ?? 1
    return {
      canGoBack: idx > 0,
      canGoForward: idx < length - 1,
    }
  }, [historyInfo])

  return (
    <div id="desktop-shell" className="flex h-screen flex-col bg-slate-900 text-slate-50">
      <header id="desktop-shell-header" className="flex items-center gap-2 border-b border-slate-700 px-4 py-2">
        <button
          className={`btn ${!canGoBack ? 'opacity-40 cursor-not-allowed' : ''}`}
          onClick={() => navigate(-1)}
          aria-label={t('nav.back')}
          title={t('nav.back')}
          disabled={!canGoBack}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
            <path d="M9 12h10" />
          </svg>
        </button>
        <button
          className={`btn ${!canGoForward ? 'opacity-40 cursor-not-allowed' : ''}`}
          onClick={() => navigate(1)}
          aria-label={t('nav.forward')}
          title={t('nav.forward')}
          disabled={!canGoForward}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
            <path d="M5 12h10" />
          </svg>
        </button>
        <button
          className="btn"
          onClick={() => navigate('/home')}
          aria-label={t('nav.home')}
          title={t('nav.home')}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9.5L12 3l9 6.5" />
            <path d="M5 10.5v10h5v-6h4v6h5v-10" />
          </svg>
        </button>
        {/* <button className="btn" onClick={() => api?.windows.showHistory()}>
          {t('nav.historyWindow')}
        </button>
        <button className="btn" onClick={() => api?.windows.showComment()}>
          {t('nav.commentWindow')}
        </button> */}
        {/* <div className="flex-1 text-center text-sm text-slate-400">{location.pathname}</div> */}
        <button
          className="btn"
          onClick={() => setSettingsOpen(true)}
          aria-label={t('nav.settings')}
          title={t('nav.settings')}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.3 4.3a2 2 0 0 1 3.4 0l.3.9a2 2 0 0 0 2.6 1.3l.9-.3a2 2 0 0 1 2.5 2.5l-.3.9a2 2 0 0 0 1.3 2.6l.9.3a2 2 0 0 1 0 3.4l-.9.3a2 2 0 0 0-1.3 2.6l.3.9a2 2 0 0 1-2.5 2.5l-.9-.3a2 2 0 0 0-2.6 1.3l-.3.9a2 2 0 0 1-3.4 0l-.3-.9a2 2 0 0 0-2.6-1.3l-.9.3a2 2 0 0 1-2.5-2.5l.3-.9a2 2 0 0 0-1.3-2.6l-.9-.3a2 2 0 0 1 0-3.4l.9-.3a2 2 0 0 0 1.3-2.6l-.3-.9a2 2 0 0 1 2.5-2.5l.9.3a2 2 0 0 0 2.6-1.3z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>
      <main id="desktop-shell-main" className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage api={api} />} />
          <Route path="/matches/:matchId" element={<MatchDetailPage api={api} />} />
          <Route path="/players/:playerId" element={<PlayerDetailPage api={api} />} />
        </Routes>
      </main>
      <SettingsDialog api={api} open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

function getHistoryInfo() {
  if (typeof window === 'undefined') {
    return { idx: 0, length: 1 }
  }

  const { state, length } = window.history
  const idx = state && typeof state.idx === 'number' ? state.idx : 0

  return { idx, length }
}

