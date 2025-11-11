import { WindowManager } from './window-manager'

type ResolveIngamePayload = (mode: 'history' | 'editor') => unknown

export class HotkeyManager {
  constructor(
    private readonly windowManager: WindowManager,
    private readonly resolveIngamePayload: ResolveIngamePayload,
  ) {}

  register() {
    overwolf?.settings?.hotkeys?.onPressed?.addListener(this.handleHotkey)
  }

  private handleHotkey = (event: overwolf.settings.hotkeys.OnPressedEvent) => {
    if (!event?.name) return

    if (event.name === 'toggle_windows') {
      const desktopVisible = this.windowManager.isVisible('desktop')
      const ingameVisible = this.windowManager.isVisible('ingame')
      if (desktopVisible || ingameVisible) {
        void this.windowManager.hideAll()
      } else {
        void this.windowManager.show('desktop')
        void this.windowManager.showIngame(this.resolveIngamePayload('history'))
      }
      return
    }

    if (event.name === 'toggle_ingame') {
      if (this.windowManager.isVisible('ingame')) {
        void this.windowManager.hide('ingame')
      } else {
        void this.windowManager.showIngame(this.resolveIngamePayload('history'))
      }
    }
  }
}

