import { useEffect } from 'react'
import type { BackgroundApi, BackgroundApiEvents } from '../types/api'

type EventKey = keyof BackgroundApiEvents

/**
 * 监听BackgroundApi事件的React Hook
 * 在组件挂载时注册事件监听器，卸载时自动取消注册
 * @param api - BackgroundApi实例
 * @param event - 事件名称
 * @param handler - 事件处理函数
 */
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

