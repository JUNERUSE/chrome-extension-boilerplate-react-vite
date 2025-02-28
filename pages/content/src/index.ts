import { sampleFunction } from '@src/sampleFunction';

console.log('content script loaded');

// Shows how to call a function defined in another module
sampleFunction();

// YouTube视频页面按钮添加功能
if (window.location.href.includes('youtube.com/watch')) {
  console.log('YouTube视频页面检测到，准备添加字幕按钮');

  // 使用setInterval持续检查并尝试添加按钮
  const buttonAddedInterval = setInterval(() => {
    const controlsSelector = '.ytp-right-controls';
    const playerControls = document.querySelector(controlsSelector);

    if (!playerControls) {
      console.log('未找到播放器控制栏，继续等待...');
      return;
    }

    // 如果按钮已存在，停止间隔
    if (document.querySelector('.ytp-subtitle-button')) {
      console.log('字幕按钮已存在，停止检查');
      clearInterval(buttonAddedInterval);
      return;
    }

    console.log('找到播放器控制栏，尝试添加字幕按钮');

    try {
      // 创建字幕按钮
      const subtitleButton = document.createElement('button');
      subtitleButton.className = 'ytp-button ytp-subtitle-button';
      subtitleButton.setAttribute('aria-label', '获取字幕');
      subtitleButton.title = '获取字幕';

      // 调整样式以匹配YouTube原生按钮
      subtitleButton.style.backgroundColor = 'transparent';
      subtitleButton.style.color = 'inherit';
      subtitleButton.style.border = 'none';
      subtitleButton.style.padding = '0';
      subtitleButton.style.cursor = 'pointer';

      // 使用SVG图标，与YouTube风格一致
      subtitleButton.innerHTML = `
        <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
          <path d="M11,11 L25,11 L25,13 L11,13 Z M14,15 L22,15 L22,17 L14,17 Z M11,19 L25,19 L25,21 L11,21 Z M14,23 L22,23 L22,25 L14,25 Z" fill="white"></path>
        </svg>
      `;

      // 添加悬停效果
      subtitleButton.addEventListener('mouseenter', () => {
        const path = subtitleButton.querySelector('path');
        if (path) {
          path.setAttribute('fill', '#ff0000');
        }
      });

      subtitleButton.addEventListener('mouseleave', () => {
        const path = subtitleButton.querySelector('path');
        if (path) {
          path.setAttribute('fill', 'white');
        }
      });

      // 添加点击事件
      subtitleButton.addEventListener('click', event => {
        event.stopPropagation();
        console.log('字幕按钮被点击');

        // 触发扩展图标点击效果
        chrome.runtime
          .sendMessage({
            type: 'TRIGGER_BADGE_CLICK',
            url: window.location.href,
          })
          .catch(() => {
            showYouTubeStyleToast('正在打开字幕查看器...');
          });
      });

      // 添加到播放器控制栏
      const miniplayerButton = playerControls.querySelector('.ytp-miniplayer-button');
      const fullscreenButton = playerControls.querySelector('.ytp-fullscreen-button');

      if (miniplayerButton) {
        playerControls.insertBefore(subtitleButton, miniplayerButton);
      } else if (fullscreenButton) {
        playerControls.insertBefore(subtitleButton, fullscreenButton);
      } else {
        playerControls.appendChild(subtitleButton);
      }
      console.log('字幕按钮已成功添加');

      // 按钮添加成功，清除间隔
      clearInterval(buttonAddedInterval);
    } catch (error) {
      console.error('添加按钮时出错:', error);
    }
  }, 1000); // 每秒检查一次

  // 60秒后停止尝试添加按钮，防止无限循环
  setTimeout(() => {
    if (buttonAddedInterval) {
      clearInterval(buttonAddedInterval);
      console.log('停止尝试添加字幕按钮');
    }
  }, 60000);
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
