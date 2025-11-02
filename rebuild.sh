#!/bin/bash

echo "🧹 清理旧编译文件..."
rm -rf dist/

echo "📦 重新编译..."
npm run build

echo "✅ 完成！"

