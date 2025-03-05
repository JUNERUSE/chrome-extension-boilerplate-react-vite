/**
 * 视频进度监听控制模块
 *
 * 该模块用于控制视频进度监听的开启和关闭，并处理视频进度消息
 */

import type { SubtitleItem } from '@extension/shared';
import {
  extractVideoId,
  fixOverlappingSubtitles,
  getYouTubeSubtitles,
  smartMergeSubtitles,
  subtitleDB,
} from '@extension/shared';

// 存储视频进度监听状态
let videoProgressMonitoringEnabled = false;

// 存储最后接收到的视频进度信息
let lastVideoProgress: {
  currentTime: number;
  duration: number;
  percentage: number;
  timestamp: number;
} | null = null;

// 存储定时器ID
let progressLogIntervalId: number | null = null;

// 字幕数据
let subtitleItems: SubtitleItem[] | null = null;

/**
 * 初始化视频进度监听控制
 */
export const initVideoProgressControl = () => {
  console.log('初始化视频进度监听控制');

  // 监听来自content script的视频进度消息
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'VIDEO_PROGRESS_UPDATE' && videoProgressMonitoringEnabled) {
      // 更新最后接收到的视频进度信息
      lastVideoProgress = {
        currentTime: message.currentTime,
        duration: message.duration,
        percentage: message.percentage,
        timestamp: Date.now(),
      };

      // 如果是来自标签页的消息，记录标签页ID
      if (sender.tab?.id) {
        // 可以在这里添加特定标签页的处理逻辑
      }
    }
  });

  // 注意：移除了 chrome.commands.onCommand 相关代码，因为它在当前环境中不可用

  console.log('视频进度监听控制初始化完成');
};

/**
 * 开启视频进度监听
 */
export const enableVideoProgressMonitoring = async () => {
  if (videoProgressMonitoringEnabled) {
    console.log('视频进度监听已经开启');
    return;
  }

  console.log('开启视频进度监听');
  videoProgressMonitoringEnabled = true;

  // 向当前活动标签页发送开启监听的消息
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'ENABLE_VIDEO_PROGRESS_TRACKING' });

      // 开始定时打印视频进度
      await startProgressLogging(activeTab);

      // 设置扩展图标状态
      chrome.action.setBadgeText({
        text: '监听',
        tabId: activeTab.id,
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#00C853',
        tabId: activeTab.id,
      });
    }
  } catch (error) {
    console.error('开启视频进度监听失败:', error);
  }
};

/**
 * 关闭视频进度监听
 */
export const disableVideoProgressMonitoring = async () => {
  if (!videoProgressMonitoringEnabled) {
    console.log('视频进度监听已经关闭');
    return;
  }

  console.log('关闭视频进度监听');
  videoProgressMonitoringEnabled = false;

  // 向当前活动标签页发送关闭监听的消息
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id && activeTab.url?.includes('youtube.com/watch')) {
      chrome.tabs
        .sendMessage(activeTab.id, { type: 'DISABLE_VIDEO_PROGRESS_TRACKING' })
        .catch(error => console.error('发送关闭监听消息失败:', error));

      // 恢复扩展图标状态
      chrome.action.setBadgeText({
        text: '字幕',
        tabId: activeTab.id,
      });
      chrome.action.setBadgeBackgroundColor({
        color: '#4285F4',
        tabId: activeTab.id,
      });
    }
  } catch (error) {
    console.error('获取当前标签页失败:', error);
  }

  // 停止定时打印视频进度
  stopProgressLogging();
};

/**
 * 切换视频进度监听状态
 */
export const toggleVideoProgressMonitoring = () => {
  if (videoProgressMonitoringEnabled) {
    disableVideoProgressMonitoring();
  } else {
    enableVideoProgressMonitoring();
  }
};

/**
 * 开始定时打印视频进度
 */
const startProgressLogging = async (tab?: chrome.tabs.Tab) => {
  if (!tab?.url) {
    return;
  }

  // 1. 获取视频ID
  const videoId = extractVideoId(tab.url);
  if (!videoId) {
    console.log('不是 YouTube 视频页面');
    return;
  }

  // 2. 获取视频ID
  // 2.1 首先从缓存字幕
  let subtitles = await subtitleDB.getSubtitles(videoId);

  // 2.1.1 如果缓存字幕不存在或者语言不是中文，则从 YouTube 获取
  if (!subtitles || !subtitles.language.includes('zh')) {
    subtitles = await getYouTubeSubtitles(videoId);
    if (!subtitles) {
      console.log('获取字幕失败');
      return;
    }

    // 2.1.2 缓存字幕
    await subtitleDB.saveSubtitles(subtitles);
  }

  // 2.2 保存字幕数据
  subtitleItems = subtitles.items;

  // 先清除可能存在的定时器
  stopProgressLogging();

  let lastSubtitleText = '';

  console.log(`[所有字幕]:`, subtitleItems.map(item => item.text).join('==='));

  const mergedSubtitles = fixOverlappingSubtitles(smartMergeSubtitles(subtitleItems, { maxTimeDiff: 30 }));

  console.log(`[合并后的字幕]:`, mergedSubtitles.map(item => item.text).join('==='));

  // 设置新的定时器，每秒打印一次视频进度
  progressLogIntervalId = self.setInterval(() => {
    if (lastVideoProgress) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();

      const currentSubtitle = subtitleItems?.find(item => {
        if (lastSubtitleText === item.text) {
          return;
        }

        const currentTime = lastVideoProgress!.currentTime * 1000;
        return currentTime >= item.startTime && currentTime <= item.endTime;
      });

      // 如果当前字幕与上一字幕相同，则不打印
      if (currentSubtitle?.text && currentSubtitle.text === lastSubtitleText) {
        return;
      }

      lastSubtitleText = currentSubtitle?.text || '';

      console.log(`[${timeString}] 当前字幕: ${currentSubtitle?.text}, 上一次字幕: ${lastSubtitleText}`);

      console.log(
        `[${timeString}] 视频进度: ${lastVideoProgress.currentTime.toFixed(2)}秒 / ${lastVideoProgress.duration.toFixed(2)}秒 (${lastVideoProgress.percentage.toFixed(2)}%)`,
      );
    }
  }, 1000);
};

/**
 * 停止定时打印视频进度
 */
const stopProgressLogging = () => {
  if (progressLogIntervalId !== null) {
    self.clearInterval(progressLogIntervalId);
    progressLogIntervalId = null;
  }
};
