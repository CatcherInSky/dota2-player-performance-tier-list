import { useEffect } from 'react'
import type { BackgroundApi, BackgroundApiEvents } from '../api/background'

type EventKey = keyof BackgroundApiEvents

export function useBackgroundEvents<EventName extends EventKey>(
  api: BackgroundApi | undefined,
  event: EventName,
  handler: (payload: BackgroundApiEvents[EventName]) => void,
) {
  useEffect(() => {
    if (!api) return
    const unsubscribe = api.events.on(event, handler as any)
    return () => {
      unsubscribe?.()
    }
  }, [api, event, handler])
}

