/**
 * Overwolf 全局类型定义
 * 基于官方文档：https://overwolf.github.io/docs/api/overwolf-api-overview
 */

declare namespace overwolf {
  namespace windows {
    interface WindowInfo {
      id: string;
      name: string;
      state: string;
      stateEx: string;
      isVisible: boolean;
      width: number;
      height: number;
      top: number;
      left: number;
    }

    interface ODKRect {
      top: number;
      left: number;
      width: number;
      height: number;
    }

    interface GetWindowStateResult {
      success: boolean;
      window_id?: string;
      window_state?: string;
      window_state_ex?: string;
    }

    interface ObtainDeclaredWindowResult {
      success: boolean;
      window: WindowInfo;
    }

    interface GetCurrentWindowResult {
      success: boolean;
      window: WindowInfo;
    }

    interface MessageReceivedEvent {
      id: string;
      content: any;
    }

    function obtainDeclaredWindow(
      windowName: string,
      callback: (result: ObtainDeclaredWindowResult) => void
    ): void;

    function getCurrentWindow(
      callback: (result: GetCurrentWindowResult) => void
    ): void;

    function restore(windowId: string, callback?: () => void): void;
    function minimize(windowId: string, callback?: () => void): void;
    function maximize(windowId: string, callback?: () => void): void;
    function close(windowId: string, callback?: () => void): void;
    function bringToFront(windowId: string, callback?: () => void): void;
    function dragMove(windowId: string, callback?: () => void): void;

    function getWindowState(
      windowId: string,
      callback: (result: GetWindowStateResult) => void
    ): void;

    function sendMessage(
      windowId: string,
      messageId: string,
      messageContent: any,
      callback?: () => void
    ): void;

    const onMessageReceived: {
      addListener(callback: (message: MessageReceivedEvent) => void): void;
      removeListener(callback: (message: MessageReceivedEvent) => void): void;
    };
  }

  namespace games {
    interface GameInfo {
      id: number;
      isRunning: boolean;
      title: string;
      width: number;
      height: number;
    }

    interface RunningGameInfo {
      isRunning: boolean;
      id?: number;
      title?: string;
      gameInfo?: GameInfo;
    }

    interface GameInfoUpdatedEvent {
      gameInfo?: GameInfo;
      runningChanged?: boolean;
      gameChanged?: boolean;
    }

    interface GetRunningGameInfoResult extends RunningGameInfo {
      success: boolean;
    }

    function getRunningGameInfo(
      callback: (result: GetRunningGameInfoResult) => void
    ): void;

    const onGameInfoUpdated: {
      addListener(callback: (event: GameInfoUpdatedEvent) => void): void;
      removeListener(callback: (event: GameInfoUpdatedEvent) => void): void;
    };

    namespace events {
      interface SetRequiredFeaturesResult {
        success: boolean;
        supportedFeatures: string[];
      }

      interface GameEvent {
        name: string;
        data: any;
      }

      interface NewGameEventsEvent {
        events: GameEvent[];
      }

      interface InfoUpdate {
        feature: string;
        info: any;
      }

      interface InfoUpdates2Event {
        info: any;
      }

      function setRequiredFeatures(
        features: string[],
        callback: (result: SetRequiredFeaturesResult) => void
      ): void;

      function getInfo(
        callback: (result: any) => void
      ): void;

      const onNewEvents: {
        addListener(callback: (event: NewGameEventsEvent) => void): void;
        removeListener(callback: (event: NewGameEventsEvent) => void): void;
      };

      const onInfoUpdates2: {
        addListener(callback: (event: InfoUpdates2Event) => void): void;
        removeListener(callback: (event: InfoUpdates2Event) => void): void;
      };
    }
  }

  namespace settings {
    namespace hotkeys {
      interface OnPressedEvent {
        name: string;
        source: string;
      }

      const onPressed: {
        addListener(callback: (event: OnPressedEvent) => void): void;
        removeListener(callback: (event: OnPressedEvent) => void): void;
      };
    }
  }

  namespace utils {
    interface SystemInfo {
      OS: string;
      NetFramework: string;
      overwolf_version: string;
    }

    interface GetSystemInformationResult {
      success: boolean;
      systemInfo: SystemInfo;
    }

    function getSystemInformation(
      callback: (result: GetSystemInformationResult) => void
    ): void;
  }
}

// 全局声明
declare const overwolf: typeof overwolf;

// 窗口对象扩展
interface Window {
  overwolf: typeof overwolf;
}
