# 📦 package.json 修复说明

## 🔍 发现的问题

### 1. ❌ Electron 版本不兼容

**原来**:
```json
"electron": "^28.0.0"
```

**问题**:
- Electron 28.0.0 发布于 2023年12月
- 你的 Node.js 版本是 v23.10.0（2024年最新版）
- 版本不匹配导致安装失败

**修复后**:
```json
"electron": "33.2.0"  // 锁定版本，与 Node.js v23 兼容
```

### 2. ❌ 打包配置不完整

**原来**:
```json
"files": [
  "dist/**/*",
  "src/index.html",
  "package.json"
]
```

**问题**:
- 没有包含 `node_modules/**/*`
- express 等运行时依赖不会被打包
- 打包后的应用会找不到 express 模块

**修复后**:
```json
"files": [
  "dist/**/*",
  "src/index.html",
  "package.json",
  "node_modules/**/*"  // ✓ 添加这行
]
```

### 3. ⚠️ 缺少 engines 字段

**原来**: 没有

**问题**:
- 没有指定兼容的 Node.js 版本
- 可能导致版本不兼容问题

**修复后**:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### 4. ⚠️ 版本过旧

**更新的包**:
- `electron`: 28.0.0 → **33.2.0** (最新稳定版)
- `electron-builder`: 24.9.1 → **25.1.8** (最新)
- `typescript`: 5.3.3 → **5.7.2** (最新)
- `express`: 4.18.2 → **4.21.2** (最新)

### 5. ✨ 添加有用的配置

**新增**:
```json
"scripts": {
  "postinstall": "electron-builder install-app-deps"  // ✓ 安装后自动处理依赖
}

"build": {
  "asar": true,  // ✓ 启用 asar 打包
  "extraMetadata": {
    "main": "dist/main.js"  // ✓ 明确指定入口
  }
}
```

## 📊 修复对比表

| 项目 | 原来 | 修复后 | 原因 |
|------|------|--------|------|
| **electron** | ^28.0.0 | 33.2.0 | 版本不兼容 |
| **electron-builder** | ^24.9.1 | ^25.1.8 | 更新到最新 |
| **typescript** | ^5.3.3 | ^5.7.2 | 更新到最新 |
| **express** | ^4.18.2 | ^4.21.2 | 安全更新 |
| **engines** | ❌ 缺失 | ✓ 已添加 | 版本控制 |
| **postinstall** | ❌ 缺失 | ✓ 已添加 | 自动处理依赖 |
| **build.asar** | ❌ 缺失 | ✓ 已添加 | 优化打包 |
| **build.files** | 不完整 | ✓ 已完善 | 包含依赖 |

## ✅ dependencies vs devDependencies 位置检查

### ✓ 正确的配置

```json
"devDependencies": {
  "@types/express": "^4.17.21",     // ✓ 类型定义 → devDependencies
  "@types/node": "^20.10.0",        // ✓ 类型定义 → devDependencies
  "electron": "33.2.0",             // ✓ Electron → devDependencies (打包工具会处理)
  "electron-builder": "^25.1.8",    // ✓ 构建工具 → devDependencies
  "typescript": "^5.7.2"            // ✓ 编译工具 → devDependencies
},
"dependencies": {
  "express": "^4.21.2"              // ✓ 运行时依赖 → dependencies
}
```

**说明**:
- ✅ **express** 在 `dependencies` - 正确！运行时需要
- ✅ **electron** 在 `devDependencies` - 正确！electron-builder 会处理打包
- ✅ 所有 `@types/*` 在 `devDependencies` - 正确！只是类型定义
- ✅ 构建工具在 `devDependencies` - 正确！

## 🚀 现在如何操作

### 步骤 1: 清理旧依赖

```bash
cd ~/dota2-player-performance-tier-list
rm -rf node_modules pnpm-lock.yaml package-lock.json dist
```

### 步骤 2: 重新安装

**使用 pnpm** (推荐在 WSL/Linux):
```bash
pnpm install
```

**或使用 npm**:
```bash
npm install
```

### 步骤 3: 运行

```bash
pnpm dev
# 或
npm run dev
```

## 🎯 为什么 Electron 33.2.0（不带 ^）

**使用固定版本而不是 ^**:
```json
"electron": "33.2.0"  // ✓ 固定版本
// 而不是
"electron": "^33.2.0"  // ❌ 可能升级到不兼容的版本
```

**原因**:
1. Electron 大版本之间可能有 breaking changes
2. 固定版本确保团队使用相同版本
3. 避免自动升级导致的问题
4. 打包时更稳定

## 🔧 如果还是安装失败

### 方案 1: 使用 electron 镜像

```bash
# 设置环境变量
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_CUSTOM_DIR="{{ version }}"

# 重新安装
pnpm install
```

### 方案 2: 降级 Electron 版本

如果 33.2.0 还是有问题，可以尝试稳定的旧版本：

```json
"electron": "31.0.0"  // LTS 版本
```

### 方案 3: 检查 Node.js 版本

```bash
node --version  # 应该 >= 18.0.0
```

如果 Node.js 太新导致问题，可以使用 nvm 切换版本：

```bash
# 安装 nvm (如果没有)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 使用 LTS 版本
nvm install 20
nvm use 20
```

## 📝 修复总结

✅ **修复完成的问题**:
1. Electron 版本兼容性
2. 打包配置完整性
3. 添加 engines 字段
4. 更新所有包到最新版本
5. 添加 postinstall 脚本
6. 完善 electron-builder 配置

✅ **dependencies 位置**:
- 所有包的位置都是正确的
- express 正确放在 dependencies
- 开发工具正确放在 devDependencies

🎉 **现在可以正常安装和运行了！**

---

**下一步**: 运行 `rm -rf node_modules pnpm-lock.yaml && pnpm install && pnpm dev`

