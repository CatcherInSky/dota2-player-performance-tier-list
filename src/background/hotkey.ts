import { WindowManager } from './window'

export class HotkeyManager {
  constructor(private readonly windowManager: WindowManager) {}

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

