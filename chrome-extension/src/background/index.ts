import 'webextension-polyfill';

import { OPEN_SIDE_PANEL_CONTEXT_MENU_ID } from '@extension/shared';

import { initBackground } from './init';

// 初始化
initBackground();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: OPEN_SIDE_PANEL_CONTEXT_MENU_ID,
    title: 'Open side panel',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === OPEN_SIDE_PANEL_CONTEXT_MENU_ID && tab) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// 检测YouTube视频页面并处理字幕
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    console.log('检测到YouTube视频页面:', tab.url);

    // 提取视频ID
    const videoId = new URL(tab.url).searchParams.get('v');

    if (videoId) {
      console.log('YouTube视频ID:', videoId);

      // 注入内容脚本以获取基本信息
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // 基本视频信息获取
          const videoTitle =
            document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer')?.textContent ||
            document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;

          const videoAuthor = document.querySelector('div#owner-name a')?.textContent;

          // 将获取到的信息发送回background脚本
          chrome.runtime.sendMessage({
            action: 'youtubeVideoBasicInfo',
            data: {
              title: videoTitle,
              author: videoAuthor,
            },
          });
        },
      });
    }
  }
});

// 接收来自内容脚本的消息
chrome.runtime.onMessage.addListener(message => {
  // 处理基本视频信息消息
  if (message.action === 'youtubeVideoBasicInfo') {
    console.log('获取到YouTube视频基本信息:');
    console.log('标题:', message.data.title);
    console.log('作者:', message.data.author);
    return false; // 不需要异步响应
  }

  // 处理字幕打印请求
  if (message.action === 'printSubtitle') {
    console.log('收到字幕打印请求:');

    // 如果是完整字幕数据
    if (message.data.subtitles && Array.isArray(message.data.subtitles)) {
      console.log(`视频ID: ${message.data.videoId} | 语言: ${message.data.language}`);
      console.log(`共获取到 ${message.data.subtitles.length} 条字幕`);
      console.log('--------------------');
      console.log(message.data.fullText?.substring(0, 1000) + '...(省略更多)');
      console.log('--------------------');

      // 通知用户字幕已打印
      showNotification('字幕获取成功', `获取到 ${message.data.subtitles.length} 条字幕`);
    }
    // 兼容旧格式
    else if (message.data.text) {
      printSubtitle(message.data.videoId, message.data.timestamp, message.data.text);
    }

    return false; // 不需要异步响应
  }

  // 处理保存字幕请求
  if (message.action === 'saveSubtitles') {
    console.log('收到保存字幕请求:');
    console.log(`视频ID: ${message.data.videoId} | 语言: ${message.data.language}`);
    console.log(`共 ${message.data.subtitles.length} 条字幕`);

    // 存储字幕数据
    chrome.storage.local.set(
      {
        [`subtitles_${message.data.videoId}`]: {
          videoId: message.data.videoId,
          language: message.data.language,
          subtitles: message.data.subtitles,
          timestamp: Date.now(),
        },
      },
      () => {
        console.log('字幕数据已保存到本地存储');
      },
    );

    return false;
  }

  return false; // 默认返回值，确保所有路径都有返回值
});

// 打印字幕
function printSubtitle(videoId: string, timestamp: number, text: string) {
  if (!text || text.trim() === '') {
    console.log(`[${formatTime(timestamp)}] 无字幕`);
    return;
  }

  console.log(`视频ID: ${videoId} | 时间: ${formatTime(timestamp)}`);
  console.log('--------------------');
  console.log(text);
  console.log('--------------------');

  // 通知用户字幕已打印
  showNotification('字幕已打印', `时间: ${formatTime(timestamp)}`);
}

// 格式化时间为 HH:MM:SS 格式
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const hrsStr = hrs > 0 ? `${hrs}:` : '';
  const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
  const secsStr = secs < 10 ? `0${secs}` : `${secs}`;

  return `${hrsStr}${minsStr}:${secsStr}`;
}

// 显示通知
function showNotification(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icon-128.png',
    title: title,
    message: message,
    priority: 2,
  });
}

// chrome.action.onClicked.addListener(async tab => {
//   await chrome.sidePanel.open({ windowId: tab.windowId });
// });

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
