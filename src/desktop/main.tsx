import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from '../shared/i18n'
import '../shared/styles/global.css'
import { DesktopApp } from './modules/DesktopApp'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <DesktopApp />
    </I18nProvider>
  </React.StrictMode>,
)

