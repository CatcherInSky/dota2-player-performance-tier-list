#!/bin/bash

# GSI配置验证脚本
# 用于检查Dota2 GSI配置是否正确

echo "========================================"
echo "Dota2 GSI 配置验证脚本"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查项计数
CHECKS_PASSED=0
CHECKS_FAILED=0

# 1. 检查配置文件是否存在
echo "📁 [1/6] 检查配置文件是否存在..."
CFG_PATH="/mnt/c/Program Files (x86)/Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/gamestate_integration_performance.cfg"

if [ -f "$CFG_PATH" ]; then
    echo -e "${GREEN}✓ 配置文件存在${NC}"
    echo "   路径: $CFG_PATH"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ 配置文件不存在${NC}"
    echo "   预期路径: $CFG_PATH"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

# 2. 检查配置文件内容
echo "📄 [2/6] 检查配置文件内容..."
if [ -f "$CFG_PATH" ]; then
    # 检查allplayers字段
    if grep -q '"allplayers".*"1"' "$CFG_PATH"; then
        echo -e "${GREEN}✓ allplayers字段已启用${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}✗ allplayers字段未启用或配置错误${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
    
    # 检查throttle设置
    THROTTLE=$(grep -oP '"throttle"\s+"\K[^"]+' "$CFG_PATH")
    if [ ! -z "$THROTTLE" ]; then
        echo -e "${GREEN}✓ throttle设置为: ${THROTTLE}秒${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ 未找到throttle设置${NC}"
    fi
    
    # 检查URI
    URI=$(grep -oP '"uri"\s+"\K[^"]+' "$CFG_PATH")
    if [ ! -z "$URI" ]; then
        echo -e "${GREEN}✓ URI设置为: ${URI}${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo -e "${RED}✗ 未找到URI设置${NC}"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠ 跳过内容检查（文件不存在）${NC}"
fi
echo ""

# 3. 检查GSI服务器是否运行
echo "🌐 [3/6] 检查GSI服务器..."
PORT=$(grep -oP '"uri".*:(\d+)/' "$CFG_PATH" | grep -oP '\d+' || echo "32866")
if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ GSI服务器正在运行（端口: $PORT）${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}✗ GSI服务器未运行或无法访问（端口: $PORT）${NC}"
    echo "   提示: 运行 'npm start' 启动服务器"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
echo ""

# 4. 检查Dota2进程
echo "🎮 [4/6] 检查Dota2进程..."
if cmd.exe /c "tasklist" 2>/dev/null | grep -i "dota2.exe" > /dev/null; then
    echo -e "${YELLOW}⚠ Dota2正在运行${NC}"
    echo "   提示: 配置文件更改后需要重启Dota2"
else
    echo -e "${GREEN}✓ Dota2未运行（可以安全重启）${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
echo ""

# 5. 检查日志目录
echo "📂 [5/6] 检查日志目录..."
LOG_DIR="/home/zhang/gsi-logs"
if [ -d "$LOG_DIR" ]; then
    LOG_COUNT=$(ls -1 "$LOG_DIR"/match-*.json 2>/dev/null | wc -l)
    echo -e "${GREEN}✓ 日志目录存在${NC}"
    echo "   路径: $LOG_DIR"
    echo "   已记录对局数: $LOG_COUNT"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    
    # 检查最新日志文件是否包含allplayers
    LATEST_LOG=$(ls -t "$LOG_DIR"/match-*.json 2>/dev/null | head -1)
    if [ ! -z "$LATEST_LOG" ]; then
        ALLPLAYERS_COUNT=$(grep -c '"allplayers"' "$LATEST_LOG" 2>/dev/null || echo "0")
        if [ "$ALLPLAYERS_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓ 最新日志包含allplayers数据（$ALLPLAYERS_COUNT处）${NC}"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
        else
            echo -e "${RED}✗ 最新日志不包含allplayers数据${NC}"
            echo "   文件: $(basename "$LATEST_LOG")"
            echo "   提示: 需要完全重启Dota2"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
        fi
    fi
else
    echo -e "${YELLOW}⚠ 日志目录不存在${NC}"
    echo "   提示: 进入对局后会自动创建"
fi
echo ""

# 6. 检查网络连通性
echo "🔌 [6/6] 检查网络连通性..."
WSL_IP=$(ip addr show eth0 | grep -oP 'inet \K[\d.]+' | head -1)
if [ ! -z "$WSL_IP" ]; then
    echo -e "${GREEN}✓ WSL IP地址: $WSL_IP${NC}"
    
    # 检查配置文件中的IP是否匹配
    if [ -f "$CFG_PATH" ]; then
        if grep -q "$WSL_IP" "$CFG_PATH"; then
            echo -e "${GREEN}✓ 配置文件使用正确的WSL IP${NC}"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
        else
            echo -e "${YELLOW}⚠ 配置文件未使用WSL IP${NC}"
            echo "   当前IP: $WSL_IP"
            echo "   提示: 可能需要更新配置文件"
        fi
    fi
else
    echo -e "${YELLOW}⚠ 无法获取WSL IP地址${NC}"
fi
echo ""

# 总结
echo "========================================"
echo "验证结果"
echo "========================================"
echo -e "通过: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "失败: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓✓✓ 所有检查通过！${NC}"
    echo ""
    echo "建议步骤:"
    echo "1. 如果Dota2正在运行，完全关闭它"
    echo "2. 重新启动Dota2"
    echo "3. 进入训练模式或真人对局"
    echo "4. 观察服务器控制台输出"
    echo "5. 运行此脚本再次验证"
else
    echo -e "${RED}✗ 发现问题，请检查失败项${NC}"
    echo ""
    echo "常见解决方案:"
    echo "1. 配置文件不存在 → 运行 'npm run build && npm start'"
    echo "2. allplayers数据缺失 → 完全重启Dota2"
    echo "3. 服务器未运行 → 运行 'npm start'"
    echo "4. IP地址不匹配 → 删除配置文件后重新生成"
fi
echo ""

# 显示配置文件内容（如果存在）
if [ -f "$CFG_PATH" ] && [ $CHECKS_FAILED -gt 0 ]; then
    echo "========================================"
    echo "当前配置文件内容："
    echo "========================================"
    cat "$CFG_PATH"
    echo ""
fi

exit $CHECKS_FAILED

