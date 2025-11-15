import { BrowserRouter } from 'react-router-dom'

import { DesktopShell } from './components/DesktopShell'

export function DesktopApp() {
  return (
    <BrowserRouter>
      <DesktopShell />
    </BrowserRouter>
  )
}

