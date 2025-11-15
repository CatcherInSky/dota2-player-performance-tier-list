import { WindowManager } from './window'

/**
 * HotkeyManager - 热键管理器
 * 负责注册和处理全局热键（toggle_windows）
 */
export class HotkeyManager {
  constructor(private readonly windowManager: WindowManager) {}

  /**
   * 注册热键监听器
   * 监听 toggle_windows 热键，用于切换窗口显示/隐藏
   */
  register() {
    overwolf?.settings?.hotkeys?.onPressed?.addListener(this.handleHotkey)
  }

  private handleHotkey = (event: overwolf.settings.hotkeys.OnPressedEvent) => {
    if (!event?.name) return

    if (event.name === 'toggle_windows') {
      if (this.windowManager.hasVisibleForeground()) {
        void this.windowManager.hideAll()
      } else {
        void this.windowManager.show('desktop')
      }
    }
  }
}

