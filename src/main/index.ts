/**
 * Background Window 主入口
 * 应用启动时执行
 */

import { appController } from './controllers/AppController';

console.log('='.repeat(60));
console.log('Dota 2 Player Performance Tracker - Background Window');
console.log('='.repeat(60));

// 初始化应用
async function main() {
  try {
    console.log('[Main] Starting application...');
    
    // 初始化 AppController
    await appController.initialize();
    
    console.log('[Main] Application started successfully');
  } catch (error) {
    console.error('[Main] Failed to start application:', error);
    
    // 显示错误提示
    // TODO: 可以显示一个错误对话框
    alert('应用启动失败，请查看控制台日志');
  }
}

// 启动应用
main();

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason);
});

// 应用关闭时清理资源
window.addEventListener('beforeunload', () => {
  console.log('[Main] Application closing...');
  appController.dispose();
});

// 开发环境：全局导出 appController 方便调试
if (import.meta.env.DEV) {
  (window as any).appController = appController;
  console.log('[Dev] appController is available as window.appController');
}
