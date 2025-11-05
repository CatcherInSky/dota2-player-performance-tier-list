import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-assets',
      closeBundle() {
        console.log('\n📦 复制资源文件...');
        
        // 复制 HTML 文件
        const htmlFiles = ['background.html', 'desktop.html', 'ingame.html'];
        htmlFiles.forEach(file => {
          try {
            copyFileSync(
              path.resolve(__dirname, `html-templates/${file}`),
              path.resolve(__dirname, `dist/${file}`)
            );
            console.log(`✅ ${file}`);
          } catch (err: any) {
            console.error(`❌ 复制失败: ${file}`, err.message);
          }
        });
        
        // 复制图标文件
        const srcIcon = path.resolve(__dirname, 'public/icon.png');
        const iconFiles = ['icon.png', 'window_icon.png', 'launcher_icon.ico'];
        
        iconFiles.forEach(dest => {
          const destPath = path.resolve(__dirname, `dist/${dest}`);
          try {
            copyFileSync(srcIcon, destPath);
            console.log(`✅ ${dest}`);
          } catch (err: any) {
            console.error(`❌ 复制失败: ${dest}`, err.message);
          }
        });
        
        // 复制 manifest.json
        try {
          copyFileSync(
            path.resolve(__dirname, 'public/manifest.json'),
            path.resolve(__dirname, 'dist/manifest.json')
          );
          console.log(`✅ manifest.json`);
        } catch (err: any) {
          console.error(`❌ 复制失败: manifest.json`, err.message);
        }
        
        console.log('✨ 资源复制完成\n');
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
  publicDir: false, // 禁用默认的 public 目录处理
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, 'src/main/index.ts'),
        desktop: path.resolve(__dirname, 'src/renderer/desktop/main.tsx'),
        ingame: path.resolve(__dirname, 'src/renderer/ingame/main.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});

