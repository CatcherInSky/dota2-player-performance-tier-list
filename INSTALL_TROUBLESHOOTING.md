# 🔧 安装故障排除指南

## 问题：npm/pnpm 安装 Electron 失败或很慢

### 症状
```
npm error command failed
npm error signal SIGINT
npm error command sh -c node install.js
```

### 原因
1. **Electron 二进制文件很大**（~100MB）
2. **从国外服务器下载慢**
3. **WSL 环境的兼容性问题**
4. **pnpm 的硬链接机制**导致二进制文件损坏

---

## 🎯 解决方案（按推荐顺序）

### 方案 1: 使用安装脚本（推荐）

```bash
cd ~/dota2-player-performance-tier-list

# 给脚本执行权限
chmod +x install.sh

# 运行安装脚本
./install.sh
```

### 方案 2: 使用 cnpm（淘宝镜像专用工具）

```bash
# 安装 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com

# 使用 cnpm 安装
cd ~/dota2-player-performance-tier-list
rm -rf node_modules
cnpm install

# 运行
npm run dev
```

### 方案 3: 手动下载 Electron

```bash
cd ~/dota2-player-performance-tier-list

# 1. 先安装其他依赖（跳过脚本）
npm install --ignore-scripts

# 2. 创建 Electron 目录
mkdir -p node_modules/electron/dist

# 3. 下载 Electron 二进制文件
# 根据你的系统选择：
# Linux x64:
wget https://npmmirror.com/mirrors/electron/31.0.0/electron-v31.0.0-linux-x64.zip
unzip electron-v31.0.0-linux-x64.zip -d node_modules/electron/dist/
chmod +x node_modules/electron/dist/electron

# 4. 创建路径文件
echo "node_modules/electron/dist/electron" > node_modules/electron/path.txt

# 5. 测试
npm run build
npm run dev
```

### 方案 4: 使用 Yarn（另一个包管理器）

```bash
# 安装 yarn
npm install -g yarn

# 配置镜像
yarn config set registry https://registry.npmmirror.com
yarn config set electron_mirror https://npmmirror.com/mirrors/electron/

# 安装
cd ~/dota2-player-performance-tier-list
rm -rf node_modules
yarn install

# 运行
yarn dev
```

### 方案 5: 不使用 Electron（临时测试）

如果只是想测试后端功能，可以先不安装 Electron：

```bash
# 1. 修改 package.json，临时移除 electron
# 将 "electron": "31.0.0" 那行注释掉

# 2. 安装其他依赖
npm install

# 3. 单独测试服务器
node -r ts-node/register src/server.ts
```

---

## 🔍 诊断步骤

### 1. 检查网络连接

```bash
# 测试能否访问镜像
curl -I https://npmmirror.com/mirrors/electron/31.0.0/

# 如果失败，尝试其他镜像：
# 华为云
curl -I https://mirrors.huaweicloud.com/electron/31.0.0/

# 清华大学
curl -I https://mirrors.tuna.tsinghua.edu.cn/electron/31.0.0/
```

### 2. 检查 npm 配置

```bash
npm config list
# 应该看到：
# registry = "https://registry.npmmirror.com"
# electron_mirror = "https://npmmirror.com/mirrors/electron/"
```

### 3. 检查磁盘空间

```bash
df -h
# 确保有至少 2GB 可用空间
```

### 4. 检查 Node.js 版本

```bash
node --version
# 应该 >= 18.0.0
```

---

## 🌐 备用镜像源

如果淘宝镜像也慢，尝试这些：

### 华为云镜像

```bash
npm config set registry https://mirrors.huaweicloud.com/repository/npm/
npm config set electron_mirror https://mirrors.huaweicloud.com/electron/
export ELECTRON_MIRROR="https://mirrors.huaweicloud.com/electron/"
```

### 腾讯云镜像

```bash
npm config set registry https://mirrors.cloud.tencent.com/npm/
npm config set electron_mirror https://mirrors.cloud.tencent.com/electron/
export ELECTRON_MIRROR="https://mirrors.cloud.tencent.com/electron/"
```

### 清华大学镜像

```bash
npm config set registry https://mirrors.tuna.tsinghua.edu.cn/npm/
npm config set electron_mirror https://mirrors.tuna.tsinghua.edu.cn/electron/
export ELECTRON_MIRROR="https://mirrors.tuna.tsinghua.edu.cn/electron/"
```

---

## 💡 最佳实践

### 1. 创建永久环境变量

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# Electron 镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_CUSTOM_DIR="{{ version }}"
```

然后执行：
```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

### 2. 项目级配置

在项目根目录的 `.npmrc` 文件中（已创建）：

```ini
registry=https://registry.npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
```

### 3. 使用离线安装

如果网络实在太差：

1. 在网络好的地方完成 `npm install`
2. 打包整个 `node_modules` 目录
3. 复制到目标机器
4. 运行 `npm rebuild`（重新编译原生模块）

---

## 🐛 常见错误及解决

### 错误 1: `SIGINT` 或 `command failed`

**原因**: 下载超时或中断

**解决**:
```bash
# 增加超时时间
npm config set fetch-timeout 600000
npm config set fetch-retry-maxtimeout 120000

# 重试
npm install
```

### 错误 2: `EACCES` 权限错误

**原因**: npm 全局目录权限问题

**解决**:
```bash
# 修改 npm 全局目录
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### 错误 3: `electron: not found`

**原因**: Electron 二进制文件未正确安装

**解决**:
```bash
# 重新安装 electron
npm rebuild electron
# 或
npm install electron --force
```

### 错误 4: `Cannot find module 'electron'`

**原因**: node_modules 损坏

**解决**:
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 安装时间参考

| 方法 | 预计时间 | 成功率 |
|------|---------|--------|
| npm (国外源) | 10-30 分钟 | 30% |
| npm (国内镜像) | 2-5 分钟 | 80% |
| cnpm | 1-3 分钟 | 90% |
| 手动下载 | 5-10 分钟 | 95% |
| yarn | 2-5 分钟 | 85% |

---

## 🆘 如果所有方法都失败

### 选项 1: 使用 Docker

创建 `Dockerfile`:
```dockerfile
FROM node:20
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

### 选项 2: 使用虚拟机

在 Windows 主机上直接开发（不用 WSL）:
```powershell
# 在 Windows PowerShell 中
cd C:\path\to\project
npm install
npm run dev
```

### 选项 3: 联系我

如果以上所有方法都不行，可能需要：
1. 检查防火墙/代理设置
2. 使用 VPN
3. 更换网络环境

---

## ✅ 验证安装成功

运行以下命令验证：

```bash
# 1. 检查 Electron
npx electron --version
# 应该输出: v31.0.0

# 2. 检查依赖
npm list electron express typescript

# 3. 编译测试
npm run build
# 应该成功生成 dist/ 目录

# 4. 运行测试
npm run dev
# 应该启动 Electron 窗口
```

---

## 📞 获取帮助

1. 查看完整日志: `~/.npm/_logs/`
2. 查看错误详情: 运行 `npm install --verbose`
3. 查看 Electron 文档: https://www.electronjs.org/

---

**祝你安装顺利！** 🚀

