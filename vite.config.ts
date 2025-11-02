import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-icons',
      closeBundle() {
        // 构建完成后复制图标文件到 dist 根目录
        console.log('\n📦 复制图标文件...');
        
        // 从 public/ 复制 icon.png 到 dist/，并创建三个不同命名的副本
        const srcIcon = path.resolve(__dirname, 'public/icon.png');
        const iconFiles = ['icon.png', 'window_icon.png', 'launcher_icon.ico'];
        
        iconFiles.forEach(dest => {
          const destPath = path.resolve(__dirname, `dist/${dest}`);
          try {
            copyFileSync(srcIcon, destPath);
            console.log(`✅ ${dest}`);
          } catch (err) {
            console.error(`❌ 复制失败: ${dest}`, err.message);
          }
        });
        
        console.log('✨ 图标复制完成\n');
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@main': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    host: '0.0.0.0', // 允许从 WSL 外部访问
    port: 5173,
    strictPort: true, // 如果端口被占用则报错，避免开多个实例
    open: false, // 不自动打开浏览器
  },
  build: {
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'public/background.html'),
        desktop: path.resolve(__dirname, 'public/desktop.html'),
        ingame: path.resolve(__dirname, 'public/ingame.html'),
      },
    },
  },
});

