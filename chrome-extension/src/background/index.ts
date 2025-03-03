import 'webextension-polyfill';

import { OPEN_POPUP_CONTEXT_MENU_ID, OPEN_SIDE_PANEL_CONTEXT_MENU_ID } from '@extension/shared';

import { initBackground } from './init';

// 初始化
initBackground();

chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: OPEN_SIDE_PANEL_CONTEXT_MENU_ID,
    title: 'Open side panel',
    contexts: ['all'],
  });

  // 创建打开popup的右键菜单
  chrome.contextMenus.create({
    id: OPEN_POPUP_CONTEXT_MENU_ID,
    title: 'Open popup',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === OPEN_SIDE_PANEL_CONTEXT_MENU_ID && tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else if (info.menuItemId === OPEN_POPUP_CONTEXT_MENU_ID && tab?.id) {
    // 打开popup
    chrome.action.openPopup();
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'TRIGGER_BADGE_CLICK' && sender.tab) {
    // 直接使用sender.tab中的windowId打开侧边栏
    chrome.sidePanel.open({
      windowId: sender.tab.windowId,
      tabId: sender.tab.id,
    });

    // 清除图标提示
    chrome.action.setBadgeText({
      text: '',
      tabId: sender.tab.id,
    });

    // 发送视频URL到side panel
    if (sender.tab.url && sender.tab.url.includes('youtube.com/watch')) {
      chrome.runtime
        .sendMessage({
          type: 'YOUTUBE_VIDEO_DETECTED',
          url: sender.tab.url,
        })
        .catch(() => {
          console.log('侧边栏可能尚未准备好接收消息');
        });
    }
  } else if (message.type === 'OPEN_POPUP' && sender.tab) {
    // 打开popup
    chrome.action.openPopup();
    // 清除图标提示
    chrome.action.setBadgeText({
      text: '',
      tabId: sender.tab.id,
    });
  }
});

// 监听标签页更新事件，当检测到YouTube视频页面时更新图标
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // 更新扩展图标显示提示
    chrome.action.setBadgeText({
      text: '字幕',
      tabId,
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#4285F4',
      tabId,
    });

    // 发送视频URL到side panel
    chrome.runtime
      .sendMessage({
        type: 'YOUTUBE_VIDEO_DETECTED',
        url: tab.url,
      })
      .catch(() => {
        console.log('侧边栏可能尚未准备好接收消息');
      });
  }
});

// 监听标签页切换事件
chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      // 更新扩展图标显示提示
      chrome.action.setBadgeText({
        text: '字幕',
        tabId: tab.id,
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#4285F4',
        tabId: tab.id,
      });

      // 发送视频URL到side panel
      chrome.runtime
        .sendMessage({
          type: 'YOUTUBE_VIDEO_DETECTED',
          url: tab.url,
        })
        .catch(() => {
          console.log('侧边栏可能尚未准备好接收消息');
        });
    }
  } catch (error) {
    console.error('获取标签页信息失败:', error);
  }
});

// 添加扩展图标点击事件处理
chrome.action.onClicked.addListener(tab => {
  if (tab.id && tab.windowId) {
    // 直接使用tab中的windowId打开侧边栏
    chrome.sidePanel.open({
      windowId: tab.windowId,
      tabId: tab.id,
    });

    // 清除图标提示
    chrome.action.setBadgeText({
      text: '',
      tabId: tab.id,
    });

    // 如果是YouTube视频页面，发送消息
    if (tab.url && tab.url.includes('youtube.com/watch')) {
      chrome.runtime
        .sendMessage({
          type: 'YOUTUBE_VIDEO_DETECTED',
          url: tab.url,
        })
        .catch(() => {
          console.log('侧边栏可能尚未准备好接收消息');
        });
    }
  }
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");
