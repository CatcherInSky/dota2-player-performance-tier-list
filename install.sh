#!/bin/bash

# Dota2 Performance MVP - 快速安装脚本
# 专为 WSL 环境优化

echo "=========================================="
echo "Dota2 Performance MVP - 安装脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 进入项目目录
cd ~/dota2-player-performance-tier-list

echo -e "${YELLOW}步骤 1: 清理旧文件...${NC}"
rm -rf node_modules package-lock.json pnpm-lock.yaml dist
echo -e "${GREEN}✓ 清理完成${NC}"

echo -e "${YELLOW}步骤 2: 配置镜像源...${NC}"
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_CUSTOM_DIR="{{ version }}"
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
echo -e "${GREEN}✓ 镜像配置完成${NC}"

echo -e "${YELLOW}步骤 3: 安装依赖（这可能需要几分钟）...${NC}"
npm install --loglevel=error

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 依赖安装成功！${NC}"
    
    echo -e "${YELLOW}步骤 4: 编译 TypeScript...${NC}"
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 编译成功！${NC}"
        echo ""
        echo "=========================================="
        echo -e "${GREEN}🎉 安装完成！${NC}"
        echo "=========================================="
        echo ""
        echo "现在可以运行以下命令启动应用："
        echo -e "${YELLOW}npm run dev${NC}"
        echo ""
    else
        echo -e "${RED}✗ 编译失败，请检查错误信息${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ 依赖安装失败${NC}"
    echo ""
    echo "尝试备用方案..."
    echo -e "${YELLOW}使用 --ignore-scripts 安装...${NC}"
    npm install --ignore-scripts --loglevel=error
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 基础依赖安装成功${NC}"
        echo -e "${YELLOW}⚠ Electron 可能需要手动配置${NC}"
        echo "请查看 INSTALL_TROUBLESHOOTING.md 获取帮助"
    else
        echo -e "${RED}✗ 安装完全失败${NC}"
        echo "请尝试以下命令手动安装："
        echo "  npm install -g cnpm --registry=https://registry.npmmirror.com"
        echo "  cnpm install"
        exit 1
    fi
fi

