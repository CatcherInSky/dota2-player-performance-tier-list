type Listener<T> = (payload: T) => void

export class EventBus<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<any>>>()

  on<EventKey extends keyof Events>(event: EventKey, listener: Listener<Events[EventKey]>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<any>)
    return () => this.off(event, listener)
  }

  off<EventKey extends keyof Events>(event: EventKey, listener: Listener<Events[EventKey]>) {
    this.listeners.get(event)?.delete(listener as Listener<any>)
  }

  emit<EventKey extends keyof Events>(event: EventKey, payload?: Events[EventKey]) {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(payload)
      } catch (error) {
        console.error(`[EventBus] listener error for event "${String(event)}"`, error)
      }
    })
  }

  clear() {
    this.listeners.clear()
  }
}

