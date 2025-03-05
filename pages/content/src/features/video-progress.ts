import { initVideoProgressTracker, stopVideoProgressTracker } from './video-progress/index';

// 添加调试信息
console.log('视频进度监听功能开始加载 - ' + new Date().toISOString());

// 初始化视频进度监听功能（但不自动启动）
initVideoProgressTracker();

// 监听页面URL变化，重新初始化视频进度监听
let lastUrl = window.location.href;

// 创建一个 MutationObserver 来监听 URL 变化
const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (lastUrl !== currentUrl) {
    lastUrl = currentUrl;
    console.log('页面 URL 变化，重新初始化视频进度监听:', lastUrl);

    // 停止旧的监听器
    stopVideoProgressTracker();

    // 重新初始化
    setTimeout(() => {
      initVideoProgressTracker();
    }, 500); // 延迟500毫秒，确保页面加载
  }
});

// 开始观察 document 的变化
observer.observe(document, { subtree: true, childList: true });

// 监听页面卸载事件，清理资源
window.addEventListener('beforeunload', () => {
  console.log('页面卸载，清理视频进度监听资源');
  observer.disconnect();
  stopVideoProgressTracker();
});
