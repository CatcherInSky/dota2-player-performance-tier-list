import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { I18nProvider } from '../shared/i18n'
import '../shared/styles/global.css'
import { DesktopApp } from './DesktopApp'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <I18nProvider>
      <DesktopApp />
    </I18nProvider>
  </StrictMode>,
)

