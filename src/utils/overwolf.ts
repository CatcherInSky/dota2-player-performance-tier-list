/**
 * Overwolf API 工具函数
 */

/// <reference path="../types/overwolf.d.ts" />

// 获取当前窗口
export const getCurrentWindow = (): Promise<overwolf.windows.WindowInfo> => {
  return new Promise((resolve, reject) => {
    overwolf.windows.getCurrentWindow((result: overwolf.windows.GetCurrentWindowResult) => {
      if (result.success) {
        resolve(result.window);
      } else {
        reject(new Error('Failed to get current window'));
      }
    });
  });
};

// 打开窗口
export const openWindow = (windowName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    overwolf.windows.obtainDeclaredWindow(windowName, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
      if (result.success) {
        overwolf.windows.restore(result.window.id, () => {
          resolve();
        });
      } else {
        reject(new Error(`Failed to open window: ${windowName}`));
      }
    });
  });
};

// 关闭窗口
export const closeWindow = (windowName?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (windowName) {
      overwolf.windows.obtainDeclaredWindow(windowName, (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          overwolf.windows.close(result.window.id, () => {
            resolve();
          });
        } else {
          reject(new Error(`Failed to close window: ${windowName}`));
        }
      });
    } else {
      overwolf.windows.getCurrentWindow((result: overwolf.windows.GetCurrentWindowResult) => {
        if (result.success) {
          overwolf.windows.close(result.window.id, () => {
            resolve();
          });
        } else {
          reject(new Error('Failed to close current window'));
        }
      });
    }
  });
};

// 最小化窗口
export const minimizeWindow = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    overwolf.windows.getCurrentWindow((result: overwolf.windows.GetCurrentWindowResult) => {
      if (result.success) {
        overwolf.windows.minimize(result.window.id, () => {
          resolve();
        });
      } else {
        reject(new Error('Failed to minimize window'));
      }
    });
  });
};

// 最大化/还原窗口
export const toggleMaximize = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    overwolf.windows.getCurrentWindow((result: overwolf.windows.GetCurrentWindowResult) => {
      if (result.success) {
        const currentState = result.window.stateEx;
        if (currentState === 'maximized') {
          overwolf.windows.restore(result.window.id, () => resolve());
        } else {
          overwolf.windows.maximize(result.window.id, () => resolve());
        }
      } else {
        reject(new Error('Failed to toggle maximize'));
      }
    });
  });
};

// 拖动窗口
export const dragWindow = (): void => {
  overwolf.windows.getCurrentWindow((result: overwolf.windows.GetCurrentWindowResult) => {
    if (result.success) {
      overwolf.windows.dragMove(result.window.id);
    }
  });
};

// 监听窗口消息
export const onMessageReceived = (callback: (message: any) => void): void => {
  overwolf.windows.onMessageReceived.addListener((message: overwolf.windows.MessageReceivedEvent) => {
    console.log('[Overwolf] Message received:', message);
    if (message.content) {
      callback(message.content);
    }
  });
};

// 获取游戏信息
export const getRunningGameInfo = (): Promise<overwolf.games.RunningGameInfo | null> => {
  return new Promise((resolve) => {
    overwolf.games.getRunningGameInfo((result: overwolf.games.GetRunningGameInfoResult) => {
      if (result && result.success && result.isRunning) {
        resolve(result as overwolf.games.RunningGameInfo);
      } else {
        resolve(null);
      }
    });
  });
};

// 模拟游戏状态变化（仅用于测试）
export const simulateGameStateChange = async (gameState: string): Promise<void> => {
  console.log('[Overwolf] Simulating game state change:', gameState);
  
  // 首先打开 ingame 窗口
  try {
    await openWindow('ingame');
    
    // 等待窗口完全打开
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 通过 Overwolf API 发送消息给 ingame 窗口
    return new Promise((resolve) => {
      overwolf.windows.obtainDeclaredWindow('ingame', (result: overwolf.windows.ObtainDeclaredWindowResult) => {
        if (result.success) {
          const message = {
            type: 'DISPLAY_MODE',
            mode: gameState === 'DOTA_GAMERULES_STATE_STRATEGY_TIME' ? 'strategy' : 'postgame'
          };
          
          overwolf.windows.sendMessage(result.window.id, 'ingame', message, () => {
            console.log('[Overwolf] Message sent to ingame window:', message);
            resolve();
          });
        } else {
          console.error('[Overwolf] Failed to get ingame window');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('[Overwolf] Failed to simulate game state:', error);
  }
};

// 检查是否在 Overwolf 环境中
export const isOverwolfApp = (): boolean => {
  return typeof overwolf !== 'undefined';
};

// 获取 Overwolf 版本
export const getOverwolfVersion = (): Promise<string> => {
  return new Promise((resolve) => {
    if (isOverwolfApp()) {
      overwolf.utils.getSystemInformation((result: overwolf.utils.GetSystemInformationResult) => {
        if (result.success) {
          resolve(result.systemInfo.overwolf_version || 'unknown');
        } else {
          resolve('unknown');
        }
      });
    } else {
      resolve('not-in-overwolf');
    }
  });
};

