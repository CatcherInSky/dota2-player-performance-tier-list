import { useEffect, useState } from 'react'
import type { BackgroundApi } from '../types/api'

async function resolveBackgroundApi(): Promise<BackgroundApi | undefined> {
  if (typeof window !== 'undefined' && window.backgroundApi) {
    return window.backgroundApi
  }

    const mainWindow = overwolf?.windows?.getMainWindow()
    if (mainWindow) {
      return (mainWindow as unknown as { backgroundApi?: BackgroundApi }).backgroundApi
    }
  

  return undefined
}

/**
 * 获取BackgroundApi的React Hook
 * 从window.backgroundApi或mainWindow.backgroundApi中获取API实例
 * @returns BackgroundApi实例，如果未找到则返回undefined
 */
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

