import { Logger } from '../shared/utils/logger'

type WindowName = 'background' | 'desktop' | 'ingame'

interface WindowState {
  name: WindowName
  isVisible: boolean
}

const DEFAULT_WINDOW_SIZES: Partial<Record<WindowName, { width: number; height: number }>> = {
  desktop: { width: 1280, height: 720 },
}

interface ObtainWindowResult {
  success?: boolean
  status?: string
  error?: string
  window?: WindowInfo | null
}

type WindowInfo = overwolf.windows.WindowInfo

export class WindowManager {
  private logger = new Logger({ namespace: 'WindowManager' })
  private windows = new Map<WindowName, WindowState>()

  constructor() {
    ;(['background', 'desktop', 'ingame'] as WindowName[]).forEach((name) =>
      this.windows.set(name, { name, isVisible: name === 'background' }),
    )
  }

  async show(name: WindowName, bringToFront = true) {


    const windowInfo = await this.obtainWindow(name)
    if (!windowInfo) return

    await this.restoreWindow(windowInfo.id)
    await this.applyDefaultSize(name, windowInfo.id)
    if (bringToFront) {
      await this.bringToFront(windowInfo.id)
    }
    this.updateVisibility(name, true)
  }

  async hide(name: WindowName) {


    const windowInfo = await this.obtainWindow(name)
    if (!windowInfo) return

    await new Promise<void>((resolve) => {
      overwolf?.windows.hide(windowInfo.id, () => resolve())
    })

    this.updateVisibility(name, false)
  }

  async minimize(name: WindowName) {
    const windowInfo = await this.obtainWindow(name)
    if (!windowInfo) return

    await new Promise<void>((resolve) => {
      overwolf?.windows.minimize(windowInfo.id, () => resolve())
    })
    this.updateVisibility(name, false)
  }

  async toggle(name: WindowName) {
    const state = this.windows.get(name)
    if (!state || !state.isVisible) {
      await this.show(name)
    } else {
      await this.hide(name)
    }
  }

  async toggleDesktop() {
    await this.toggle('desktop')
  }

  async showIngame(payload?: unknown) {
    await this.show('ingame')
    if (payload && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('background:ingame:data', {
          detail: payload,
        }),
      )
    }
  }

  getWindowState(name: WindowName) {
    return this.windows.get(name)
  }

  isVisible(name: WindowName) {
    return this.windows.get(name)?.isVisible ?? false
  }

  async hideAll() {
    await Promise.all([this.hide('desktop'), this.hide('ingame')])
  }

  async dragMove(name: WindowName) {
    overwolf?.windows.dragMove(name)
  }

  private updateVisibility(name: WindowName, isVisible: boolean) {
    const state = this.windows.get(name)
    if (state) {
      state.isVisible = isVisible
      this.windows.set(name, state)
    }
  }

  private async applyDefaultSize(name: WindowName, windowId: string) {
    const size = DEFAULT_WINDOW_SIZES[name]
    if (!size) return
    await new Promise<void>((resolve) => {
      overwolf?.windows.changeSize(windowId, size.width, size.height, () => resolve())
    })
  }

  private obtainWindow(name: WindowName): Promise<WindowInfo | null> {
    return new Promise((resolve) => {
      overwolf?.windows.obtainDeclaredWindow(name, (result) => {
        const info = (result ?? {}) as ObtainWindowResult
        const successFlag = typeof info.success === 'boolean' ? info.success : undefined
        const statusFlag = typeof info.status === 'string' ? info.status !== 'error' : undefined
        const isSuccess = successFlag ?? statusFlag ?? true

        if (isSuccess && info.window) {
          resolve(info.window)
        } else {
          this.logger.warn('Failed to obtain window', name, info)
          resolve(null)
        }
      })
    })
  }

  private restoreWindow(windowId: string): Promise<void> {
    return new Promise((resolve) => {
      overwolf?.windows.restore(windowId, () => resolve())
    })
  }

  private bringToFront(windowId: string): Promise<void> {
    return new Promise((resolve) => {
      overwolf?.windows.bringToFront(windowId, () => resolve())
    })
  }
}

