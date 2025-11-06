# Overwolf 窗口管理功能说明

本文档基于 Overwolf 官方文档，说明窗口管理相关功能是否满足 desktop 和 ingame 容器的要求。

参考文档：
- [Overwolf SDK Introduction](https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction)
- [Overwolf API Overview](https://dev.overwolf.com/ow-native/reference/ow-api-overview)

## 窗口配置选项（manifest.json）

### 1. 调节窗口尺寸和位置

**✅ 支持** - Overwolf 完全支持

#### 初始尺寸和位置配置
```json
"windows": {
  "desktop": {
    "resizable": true,           // 允许用户调整大小
    "size": {
      "width": 1200,
      "height": 800
    },
    "min_size": {                // 最小尺寸限制
      "width": 800,
      "height": 600
    },
    "start_position": {          // 初始位置
      "top": 100,
      "left": 100
    }
  }
}
```

#### 运行时 API 调整
```typescript
// 拖动窗口位置
overwolf.windows.dragMove(windowId);

// 获取窗口信息（包含位置和尺寸）
overwolf.windows.getCurrentWindow((result) => {
  const { top, left, width, height } = result.window;
});

// 注意：Overwolf 不提供直接设置窗口位置的 API
// 但用户可以通过拖动窗口来改变位置
```

**结论**：✅ 满足 desktop 和 ingame 的"可以调节尺寸和位置"要求

---

### 2. 快捷键控制显示

**✅ 支持** - Overwolf 完全支持

#### manifest.json 配置
```json
"hotkeys": {
  "toggle_windows": {
    "title": "Toggle All Windows",
    "action-type": "custom",      // 自定义动作
    "default": "Alt+Shift+D"
  },
  "toggle_desktop": {
    "title": "Toggle Desktop Window",
    "action": "ToggleWindow",     // 内置动作：切换窗口显示
    "target": "desktop",           // 目标窗口
    "default": "Ctrl+Shift+D"
  },
  "toggle_ingame": {
    "title": "Toggle In-Game Window",
    "action": "ToggleWindow",
    "target": "ingame",
    "default": "Ctrl+Shift+I"
  }
}
```

#### 在 background 中监听自定义热键
```typescript
overwolf.settings.hotkeys.onPressed.addListener((event) => {
  if (event.name === 'toggle_windows') {
    // 自定义逻辑：切换所有窗口显示状态
    toggleAllWindows();
  }
});
```

**结论**：✅ 满足 desktop 和 ingame 的"快捷键控制显示"要求

---

### 3. 窗口按钮控制（关闭/最小化）

**⚠️ 部分支持** - 需要确认具体配置选项

#### 可能的配置选项（需验证）
```json
"windows": {
  "desktop": {
    "show_close_button": false,      // ❓ 需要验证是否支持
    "show_minimize_button": true,     // ❓ 需要验证是否支持
    "show_maximize_button": false     // ❓ 需要验证是否支持
  }
}
```

#### 当前已知的配置
```json
"windows": {
  "desktop": {
    "show_in_taskbar": true,         // ✅ 确认支持：是否显示在任务栏
    "resizable": true,               // ✅ 确认支持：是否可调整大小
    "transparent": false              // ✅ 确认支持：是否透明
  },
  "ingame": {
    "show_in_taskbar": false,        // ✅ 确认支持：游戏内窗口通常不显示在任务栏
    "desktop_only": false,            // ✅ 确认支持：是否仅在桌面显示
    "native_window": false            // ✅ 确认支持：是否使用原生窗口
  }
}
```

#### 替代方案：通过代码控制
```typescript
// 虽然可能无法隐藏关闭按钮，但可以通过以下方式控制：
// 1. 监听窗口关闭事件，阻止关闭或执行自定义逻辑
// 2. 使用 minimize() 代替 close()
// 3. 在窗口内提供自定义的"关闭"按钮，实际执行 minimize()

// 最小化窗口（而不是关闭）
overwolf.windows.minimize(windowId);

// 关闭窗口
overwolf.windows.close(windowId);
```

**结论**：⚠️ **部分满足** - 需要进一步验证 `show_close_button` 等配置是否在 Overwolf Native 中支持。如果不支持，可以通过代码逻辑实现类似效果（使用 minimize 代替 close）。

---

### 4. 透明度调节

**✅ 支持** - Overwolf 完全支持

#### manifest.json 配置
```json
"windows": {
  "desktop": {
    "transparent": false              // 不透明（桌面窗口）
  },
  "ingame": {
    "transparent": true                // 透明（游戏内覆盖层）
  }
}
```

#### 运行时 API（需要验证）
```typescript
// 注意：Overwolf 可能不提供运行时动态调整透明度的 API
// 透明度通常在 manifest.json 中静态配置
```

**结论**：✅ 满足 desktop 的"可以调透明度"要求（通过 manifest.json 配置）

---

## Desktop 容器要求对比

| 需求 | Overwolf 支持 | 实现方式 |
|------|--------------|----------|
| 可以调节尺寸和位置 | ✅ 完全支持 | `resizable: true` + `start_position` + `dragMove()` API |
| 只有缩小没有关闭 | ⚠️ 需验证 | 验证 `show_close_button: false` 是否支持，或使用代码逻辑 |
| 可以调透明度 | ✅ 支持 | `transparent: true/false` |
| 非 overlay | ✅ 支持 | `desktop_only: false` + `transparent: false` |

**总体评估**：✅ **基本满足**，但需要验证关闭按钮控制的具体实现方式

---

## Ingame 容器要求对比

| 需求 | Overwolf 支持 | 实现方式 |
|------|--------------|----------|
| 可以调节尺寸和位置 | ✅ 完全支持 | `resizable: true` + `start_position` + `dragMove()` API |
| 快捷键控制显示 | ✅ 完全支持 | `hotkeys` 配置 + `action: "ToggleWindow"` |
| 按钮控制显示关闭 | ⚠️ 需验证 | 验证 `show_close_button: false` 是否支持，或使用代码逻辑 |
| 自动弹出 overlay | ✅ 支持 | background 监听游戏事件，调用 `restore()` 打开窗口 |

**总体评估**：✅ **基本满足**，但需要验证关闭按钮控制的具体实现方式

---

## 建议的实现方案

### Desktop 窗口配置
```json
"desktop": {
  "file": "desktop.html",
  "transparent": false,
  "resizable": true,
  "show_in_taskbar": true,
  "size": {
    "width": 1200,
    "height": 800
  },
  "min_size": {
    "width": 800,
    "height": 600
  },
  "start_position": {
    "top": 100,
    "left": 100
  }
  // 注意：如果 show_close_button 不支持，考虑以下方案：
  // 1. 在窗口内提供自定义关闭按钮，执行 minimize()
  // 2. 监听窗口关闭事件，执行自定义逻辑
}
```

### Ingame 窗口配置
```json
"ingame": {
  "file": "ingame.html",
  "transparent": true,
  "resizable": true,              // 允许用户调整大小
  "show_in_taskbar": false,
  "desktop_only": false,
  "native_window": false,
  "size": {
    "width": 400,
    "height": 300
  },
  "start_position": {
    "top": 100,
    "left": 100
  }
}
```

### 快捷键配置
```json
"hotkeys": {
  "toggle_desktop": {
    "title": "Toggle Desktop Window",
    "action": "ToggleWindow",
    "target": "desktop",
    "default": "Ctrl+Shift+D"
  },
  "toggle_ingame": {
    "title": "Toggle In-Game Window",
    "action": "ToggleWindow",
    "target": "ingame",
    "default": "Ctrl+Shift+I"
  }
}
```

---

## 需要进一步验证的事项

1. **`show_close_button` 配置**：
   - 查询 Overwolf 官方文档确认是否支持
   - 如果不支持，使用代码逻辑实现（minimize 代替 close）

2. **运行时透明度调整**：
   - 确认是否提供 API 动态调整透明度
   - 如果不支持，透明度只能在 manifest.json 中静态配置

3. **窗口位置 API**：
   - 确认是否有 API 可以程序化设置窗口位置
   - 当前已知 `dragMove()` 允许用户拖动，但可能需要验证是否有 `setPosition()` 类似的 API

---

## 参考资源

- [Overwolf SDK Introduction](https://dev.overwolf.com/ow-native/reference/ow-sdk-introduction)
- [Overwolf API Overview](https://dev.overwolf.com/ow-native/reference/ow-api-overview)
- [Overwolf Windows API](https://dev.overwolf.com/ow-native/reference/ow-api-overview#windows)

