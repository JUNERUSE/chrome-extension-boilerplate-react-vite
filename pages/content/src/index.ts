import './features/audio-replacer';
import './features/video-progress';

import { sampleFunction } from '@src/sampleFunction';

// 添加更多调试信息，确保脚本正确加载
console.log('内容脚本开始加载 - ' + new Date().toISOString());

// 确保内容脚本在页面加载时正确初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded事件触发 - 内容脚本已初始化');
});

// 在window.onload事件中再次确认脚本已加载
window.addEventListener('load', () => {
  console.log('Window.onload事件触发 - 页面完全加载');

  // 检查 chrome API 是否可用
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // 主动发送消息到后台脚本，确认内容脚本已加载
    chrome.runtime
      .sendMessage({ type: 'CONTENT_SCRIPT_LOADED' })
      .then(response => console.log('收到后台脚本响应:', response))
      .catch(error => console.error('发送消息到后台脚本失败:', error));

    // 添加全局错误处理，捕获未处理的runtime.lastError
    // 不覆盖原始方法，而是添加全局错误处理器
    window.addEventListener('unhandledrejection', event => {
      if (
        event.reason &&
        typeof event.reason.message === 'string' &&
        event.reason.message.includes('message port closed')
      ) {
        console.warn('捕获到未处理的消息端口关闭错误:', event.reason);
        event.preventDefault();
      }
    });

    // 添加全局错误处理，捕获未处理的runtime.lastError
    window.addEventListener('error', event => {
      if (event.error && event.error.message && event.error.message.includes('message port closed')) {
        console.warn('捕获到消息端口关闭错误，这通常是因为页面刷新或导航');
        event.preventDefault();
      }
    });
  } else {
    console.warn('chrome.runtime API 不可用，可能是因为内容脚本运行在 MAIN 世界中');
  }
});

console.log('content script loaded');

// Shows how to call a function defined in another module
sampleFunction();

// YouTube视频页面按钮添加功能
if (window.location.href.includes('youtube.com/watch')) {
  console.log('YouTube视频页面检测到，准备添加扩展按钮');

  // 使用MutationObserver监听DOM变化，确保在播放器控制栏加载后添加按钮
  const observer = new MutationObserver(() => {
    const controlsSelector = '.ytp-right-controls';
    const playerControls = document.querySelector(controlsSelector);

    if (playerControls) {
      // 如果按钮已存在，不再添加
      if (document.querySelector('.ytp-extension-button')) {
        console.log('扩展按钮已存在，不再添加');
        return;
      }

      console.log('找到播放器控制栏，尝试添加扩展按钮');
      addExtensionButton(playerControls);

      // 不断开观察器，因为YouTube是SPA，页面可能会重新加载控制栏
    }
  });

  // 开始观察整个文档
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 同时使用定时器作为备份方案
  const buttonAddedInterval = setInterval(() => {
    const controlsSelector = '.ytp-right-controls';
    const playerControls = document.querySelector(controlsSelector);

    if (!playerControls) {
      console.log('未找到播放器控制栏，继续等待...');
      return;
    }

    // 如果按钮已存在，停止间隔
    if (document.querySelector('.ytp-extension-button')) {
      console.log('扩展按钮已存在，停止检查');
      clearInterval(buttonAddedInterval);
      return;
    }

    console.log('通过定时器找到播放器控制栏，尝试添加扩展按钮');
    addExtensionButton(playerControls);
    clearInterval(buttonAddedInterval);
  }, 1000); // 每秒检查一次

  // 在页面加载完成后也尝试添加按钮
  window.addEventListener('load', () => {
    const controlsSelector = '.ytp-right-controls';
    const playerControls = document.querySelector(controlsSelector);

    if (playerControls && !document.querySelector('.ytp-extension-button')) {
      console.log('页面加载完成，尝试添加扩展按钮');
      addExtensionButton(playerControls);
    }
  });

  // 监听YouTube的导航事件（因为YouTube是SPA）
  window.addEventListener('yt-navigate-finish', () => {
    if (window.location.href.includes('youtube.com/watch')) {
      const controlsSelector = '.ytp-right-controls';
      const playerControls = document.querySelector(controlsSelector);

      if (playerControls && !document.querySelector('.ytp-extension-button')) {
        console.log('YouTube导航完成，尝试添加扩展按钮');
        addExtensionButton(playerControls);
      }
    }
  });
}

// 添加扩展按钮的函数
function addExtensionButton(playerControls: Element) {
  try {
    // 创建扩展按钮
    const extensionButton = document.createElement('button');
    extensionButton.className = 'ytp-button ytp-extension-button';
    extensionButton.setAttribute('aria-label', '打开扩展');
    extensionButton.title = '打开扩展';

    // 调整样式以匹配YouTube原生按钮
    extensionButton.style.backgroundColor = 'transparent';
    extensionButton.style.color = 'inherit';
    extensionButton.style.border = 'none';
    extensionButton.style.padding = '0';
    extensionButton.style.cursor = 'pointer';

    // 使用SVG图标，与YouTube风格一致
    extensionButton.innerHTML = `
      <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
          <path d="M11,11 L25,11 L25,13 L11,13 Z M14,15 L22,15 L22,17 L14,17 Z M11,19 L25,19 L25,21 L11,21 Z M14,23 L22,23 L22,25 L14,25 Z" fill="white"></path>
      </svg>
    `;

    // 添加悬停效果
    extensionButton.addEventListener('mouseenter', () => {
      const path = extensionButton.querySelector('path');
      if (path) {
        path.setAttribute('fill', '#ff0000');
      }
    });

    extensionButton.addEventListener('mouseleave', () => {
      const path = extensionButton.querySelector('path');
      if (path) {
        path.setAttribute('fill', 'white');
      }
    });

    // 添加点击事件
    extensionButton.addEventListener('click', event => {
      event.stopPropagation();
      console.log('扩展按钮被点击');

      // 检查 chrome API 是否可用
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        // 打开扩展的popup
        chrome.runtime
          .sendMessage({
            type: 'OPEN_POPUP',
            url: window.location.href,
          })
          .catch(() => {
            showYouTubeStyleToast('正在打开扩展...');
          });
      } else {
        console.warn('chrome.runtime API 不可用，无法发送消息');
        showYouTubeStyleToast('正在打开扩展...');
      }
    });

    // 添加到播放器控制栏
    const miniplayerButton = playerControls.querySelector('.ytp-miniplayer-button');
    const fullscreenButton = playerControls.querySelector('.ytp-fullscreen-button');

    if (miniplayerButton) {
      playerControls.insertBefore(extensionButton, miniplayerButton);
    } else if (fullscreenButton) {
      playerControls.insertBefore(extensionButton, fullscreenButton);
    } else {
      playerControls.appendChild(extensionButton);
    }
    console.log('扩展按钮已成功添加');

    return true;
  } catch (error) {
    console.error('添加扩展按钮时出错:', error);
    return false;
  }
}

// 显示YouTube风格的提示toast
function showYouTubeStyleToast(message: string) {
  // 移除已有的toast
  const existingToast = document.querySelector('.youtube-style-toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }

  // 创建一个YouTube风格的toast
  const toast = document.createElement('div');
  toast.className = 'youtube-style-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(33, 33, 33, 0.9);
    color: white;
    padding: 10px 16px;
    border-radius: 2px;
    z-index: 9999;
    font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    pointer-events: none;
  `;
  toast.textContent = message;

  // 添加到页面
  document.body.appendChild(toast);

  // 显示toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // 3秒后淡出
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
