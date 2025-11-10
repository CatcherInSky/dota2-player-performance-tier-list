export type OverwolfAPI = typeof overwolf

declare global {
  interface Window {
    overwolf?: OverwolfAPI
  }
}

export function getOverwolf(): OverwolfAPI | undefined {
  if (typeof overwolf !== 'undefined') {
    return overwolf
  }
  if (typeof window !== 'undefined' && typeof window.overwolf !== 'undefined') {
    return window.overwolf
  }
  return undefined
}

export function isOverwolfAvailable(): boolean {
  return typeof getOverwolf() !== 'undefined'
}

