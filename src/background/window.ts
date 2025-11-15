import { Logger } from '../shared/utils/logger'

type WindowName = 'background' | 'desktop' | 'history' | 'comment'

interface WindowState {
  name: WindowName
  isVisible: boolean
}

const DEFAULT_WINDOW_SIZES: Partial<Record<WindowName, { width: number; height: number }>> = {
  desktop: { width: 1280, height: 720 },
  history: { width: 1920, height: 200 },
  comment: { width: 1920, height: 200 },
}

interface ObtainWindowResult {
  success?: boolean
  status?: string
  error?: string
  window?: WindowInfo | null
}

type WindowInfo = overwolf.windows.WindowInfo

/**
 * WindowManager - 窗口管理器
 * 负责管理应用的所有窗口（background, desktop, history, comment）的显示、隐藏和状态
 */
export class WindowManager {
  private logger = new Logger({ namespace: 'WindowManager' })
  private windows = new Map<WindowName, WindowState>()

  constructor() {
    ;(['background', 'desktop', 'history', 'comment'] as WindowName[]).forEach((name) =>
      this.windows.set(name, { name, isVisible: name === 'background' }),
    )
  }

  /**
   * 显示指定窗口
   * - 获取窗口信息
   * - 恢复窗口（如果被最小化）
   * - 应用默认尺寸
   * - 将窗口置于前台（可选）
   * - 更新窗口可见状态
   */
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

  /**
   * 隐藏指定窗口
   * 更新窗口可见状态为false
   */
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

  /**
   * 切换desktop窗口的显示/隐藏状态
   */
  async toggleDesktop() {
    await this.toggle('desktop')
  }

  /**
   * 显示history窗口并触发数据更新事件
   * 用于在比赛开始时显示历史记录覆盖层
   */
  async showHistory() {
    await this.show('history')
    this.dispatchEvent('background:history:data')
  }

  async hideHistory() {
    await this.hide('history')
  }

  /**
   * 显示comment窗口并触发数据更新事件
   * 用于在比赛结束时显示评价编辑窗口
   */
  async showComment() {
    await this.show('comment')
    this.dispatchEvent('background:comment:data')
  }

  getWindowState(name: WindowName) {
    return this.windows.get(name)
  }

  isVisible(name: WindowName) {
    return this.windows.get(name)?.isVisible ?? false
  }

  async hideAll() {
    await Promise.all([this.hide('desktop'), this.hide('history'), this.hide('comment')])
  }

  async dragMove(name: WindowName) {
    overwolf?.windows.dragMove(name)
  }

  /**
   * 检查是否有可见的前台窗口
   * @returns true表示desktop/history/comment中至少有一个可见，false表示全部隐藏
   */
  hasVisibleForeground() {
    return ['desktop', 'history', 'comment'].some((name) => this.isVisible(name as WindowName))
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

  private dispatchEvent(eventName: string, payload?: unknown) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: payload,
      }),
    )
  }
}

