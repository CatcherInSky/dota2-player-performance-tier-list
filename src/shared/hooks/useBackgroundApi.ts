import { useEffect, useState } from 'react'
import type { BackgroundApi } from '../api/background'
import { getOverwolf, isOverwolfAvailable } from '../utils/overwolf'

async function resolveBackgroundApi(): Promise<BackgroundApi | undefined> {
  if (typeof window !== 'undefined' && window.backgroundApi) {
    return window.backgroundApi
  }

  if (isOverwolfAvailable()) {
    const overwolf = getOverwolf()
    const mainWindow = overwolf?.windows?.getMainWindow()
    if (mainWindow) {
      return (mainWindow as unknown as { backgroundApi?: BackgroundApi }).backgroundApi
    }
  }

  return undefined
}

export function useBackgroundApi() {
  const [api, setApi] = useState<BackgroundApi | undefined>(() => window.backgroundApi)

  useEffect(() => {
    if (api) return
    let mounted = true
    resolveBackgroundApi().then((resolved) => {
      if (mounted && resolved) {
        setApi(resolved)
      }
    })
    return () => {
      mounted = false
    }
  }, [api])

  return api
}

