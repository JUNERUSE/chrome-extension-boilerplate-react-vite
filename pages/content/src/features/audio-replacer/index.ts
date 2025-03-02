import { handleAudioReplace } from './audio-handler';
import { setupMessageListeners } from './messaging';
import { resetState } from './state';

/**
 * 检查当前页面是否是 YouTube 视频页面
 */
function isYoutubeVideoPage(): boolean {
  try {
    const url = window.location.href;
    const urlObj = new URL(url);
    return (
      (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) ||
      urlObj.hostname.includes('youtu.be')
    );
  } catch (error) {
    console.error('检查页面 URL 失败:', error);
    return false;
  }
}

/**
 * 通知侧边栏页面状态变化
 */
function notifySidePanelPageChange(isYoutubePage: boolean): void {
  try {
    chrome.runtime.sendMessage({
      type: 'PAGE_CHANGE',
      isYoutubePage,
      url: window.location.href,
    });
    console.log('已通知侧边栏页面变化:', isYoutubePage ? 'YouTube页面' : '非YouTube页面');
  } catch (error) {
    console.error('通知侧边栏失败:', error);
  }
}

/**
 * 初始化音频替换功能
 */
export function initAudioReplacer(): void {
  console.log('初始化音频替换功能');

  // 重置状态
  resetState();

  // 设置消息监听器
  setupMessageListeners(handleAudioReplace);

  // 初始通知侧边栏当前页面状态
  const isYoutubePage = isYoutubeVideoPage();
  notifySidePanelPageChange(isYoutubePage);

  // 监听页面 URL 变化
  let lastUrl = window.location.href;
  let lastIsYoutubePage = isYoutubePage;

  // 创建一个 MutationObserver 来监听 URL 变化
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (lastUrl !== currentUrl) {
      lastUrl = currentUrl;
      console.log('页面 URL 变化:', lastUrl);

      // 检查是否是 YouTube 视频页面
      const currentIsYoutubePage = isYoutubeVideoPage();

      // 如果页面类型变化（YouTube/非YouTube）或者是YouTube页面但URL变化，通知侧边栏
      if (lastIsYoutubePage !== currentIsYoutubePage || currentIsYoutubePage) {
        lastIsYoutubePage = currentIsYoutubePage;

        if (!currentIsYoutubePage) {
          console.log('当前不是 YouTube 视频页面，重置音频替换状态');
          resetState();
        }

        // 通知侧边栏页面变化
        notifySidePanelPageChange(currentIsYoutubePage);
      }
    }
  });

  // 开始观察 document 的变化
  observer.observe(document, { subtree: true, childList: true });

  // 使用 history API 监听 URL 变化
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    // 检测到 pushState 变化
    setTimeout(() => {
      const currentIsYoutubePage = isYoutubeVideoPage();
      if (lastIsYoutubePage !== currentIsYoutubePage || currentIsYoutubePage) {
        lastIsYoutubePage = currentIsYoutubePage;
        lastUrl = window.location.href;
        console.log('检测到 pushState 变化:', lastUrl);

        if (!currentIsYoutubePage) {
          resetState();
        }

        notifySidePanelPageChange(currentIsYoutubePage);
      }
    }, 0);
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    // 检测到 replaceState 变化
    setTimeout(() => {
      const currentIsYoutubePage = isYoutubeVideoPage();
      if (lastIsYoutubePage !== currentIsYoutubePage || currentIsYoutubePage) {
        lastIsYoutubePage = currentIsYoutubePage;
        lastUrl = window.location.href;
        console.log('检测到 replaceState 变化:', lastUrl);

        if (!currentIsYoutubePage) {
          resetState();
        }

        notifySidePanelPageChange(currentIsYoutubePage);
      }
    }, 0);
  };

  // 监听 popstate 事件
  window.addEventListener('popstate', () => {
    const currentIsYoutubePage = isYoutubeVideoPage();
    if (lastIsYoutubePage !== currentIsYoutubePage || currentIsYoutubePage) {
      lastIsYoutubePage = currentIsYoutubePage;
      lastUrl = window.location.href;
      console.log('检测到 popstate 变化:', lastUrl);

      if (!currentIsYoutubePage) {
        resetState();
      }

      notifySidePanelPageChange(currentIsYoutubePage);
    }
  });

  // 监听页面卸载事件，清理资源
  window.addEventListener('beforeunload', () => {
    console.log('页面卸载，清理音频替换资源');
    observer.disconnect();
    resetState();
    // 通知侧边栏页面卸载
    notifySidePanelPageChange(false);
  });

  console.log('音频替换功能初始化完成');
}
