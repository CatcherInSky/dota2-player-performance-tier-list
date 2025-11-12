import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from '../shared/i18n'
import '../shared/styles/global.css'
import { HistoryApp } from '../ingame/modules/IngameApp'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <HistoryApp />
    </I18nProvider>
  </React.StrictMode>,
)


