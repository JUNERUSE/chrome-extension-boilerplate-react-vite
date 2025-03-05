/**
 * 视频进度监听模块
 *
 * 该模块用于监听YouTube视频的播放进度变化，并通过消息传递给扩展的其他部分
 */

// 定义进度更新的消息类型
export interface VideoProgressMessage {
  type: 'VIDEO_PROGRESS_UPDATE';
  currentTime: number; // 当前播放时间（秒）
  duration: number; // 视频总时长（秒）
  percentage: number; // 播放进度百分比（0-100）
  isPlaying: boolean; // 是否正在播放
  playbackRate: number; // 播放速度
}

// 存储上次发送的进度信息，避免频繁发送相同数据
let lastProgressMessage: VideoProgressMessage | null = null;
// 存储定时器ID
let progressIntervalId: number | null = null;
// 存储事件监听器清理函数
let cleanupListeners: (() => void) | null = null;
// 存储是否启用监听
let isTrackingEnabled = false;

/**
 * 初始化视频进度监听
 */
export function initVideoProgressTracker(): void {
  console.log('初始化视频进度监听器');

  // 如果已经初始化，先清理
  if (progressIntervalId !== null || cleanupListeners !== null) {
    stopVideoProgressTracker();
  }

  // 检查当前页面是否是YouTube视频页面
  if (!isYoutubeVideoPage()) {
    console.log('当前不是YouTube视频页面，不启动进度监听');
    return;
  }

  // 设置消息监听器，接收后台脚本的控制命令
  setupMessageListeners();

  // 默认不启动监听，等待后台脚本的启动命令
  isTrackingEnabled = false;

  console.log('视频进度监听器初始化完成，等待启动命令');
}

/**
 * 停止视频进度监听
 */
export function stopVideoProgressTracker(): void {
  console.log('停止视频进度监听器');

  // 清除定时器
  if (progressIntervalId !== null) {
    window.clearInterval(progressIntervalId);
    progressIntervalId = null;
  }

  // 清除事件监听器
  if (cleanupListeners !== null) {
    cleanupListeners();
    cleanupListeners = null;
  }

  // 重置上次发送的进度信息
  lastProgressMessage = null;

  // 重置启用状态
  isTrackingEnabled = false;

  console.log('视频进度监听器已停止');
}

/**
 * 启动视频进度监听
 */
export function startVideoProgressTracker(): void {
  console.log('启动视频进度监听');

  // 如果已经启动，不重复启动
  if (isTrackingEnabled && progressIntervalId !== null) {
    console.log('视频进度监听已经启动');
    return;
  }

  // 设置启用状态
  isTrackingEnabled = true;

  // 设置定时器，定期检查视频进度
  progressIntervalId = window.setInterval(checkVideoProgress, 500); // 每500毫秒检查一次

  // 添加事件监听器，监听视频播放状态变化
  setupVideoEventListeners();

  console.log('视频进度监听已启动');
}

/**
 * 设置消息监听器
 */
function setupMessageListeners(): void {
  // 监听来自后台脚本的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ENABLE_VIDEO_PROGRESS_TRACKING') {
      console.log('收到启动视频进度监听命令');
      startVideoProgressTracker();
      // 发送响应
      sendResponse({ success: true });
      return true; // 表示异步发送响应
    } else if (message.type === 'DISABLE_VIDEO_PROGRESS_TRACKING') {
      console.log('收到停止视频进度监听命令');
      stopVideoProgressTracker();
      // 发送响应
      sendResponse({ success: true });
      return true; // 表示异步发送响应
    }
    return false; // 不处理其他消息
  });
}

/**
 * 检查当前页面是否是YouTube视频页面
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
    console.error('检查页面URL失败:', error);
    return false;
  }
}

/**
 * 检查视频进度并发送消息
 */
function checkVideoProgress(): void {
  // 如果未启用监听，不执行检查
  if (!isTrackingEnabled) {
    return;
  }

  const video = document.querySelector('video');
  if (!video) {
    console.warn('未找到视频元素，无法检查进度');
    return;
  }

  // 获取视频信息
  const currentTime = video.currentTime;
  const duration = video.duration || 0;
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isPlaying = !video.paused && !video.ended && video.readyState > 2;
  const playbackRate = video.playbackRate;

  // 创建进度消息
  const progressMessage: VideoProgressMessage = {
    type: 'VIDEO_PROGRESS_UPDATE',
    currentTime,
    duration,
    percentage,
    isPlaying,
    playbackRate,
  };

  // 检查是否与上次发送的消息相同（避免频繁发送相同数据）
  if (shouldSendProgressUpdate(progressMessage)) {
    // 发送消息到扩展的其他部分
    sendVideoProgressMessage(progressMessage);
    // 更新上次发送的消息
    lastProgressMessage = progressMessage;
  }
}

/**
 * 判断是否应该发送进度更新
 * @param currentMessage 当前进度消息
 * @returns 是否应该发送
 */
function shouldSendProgressUpdate(currentMessage: VideoProgressMessage): boolean {
  // 如果没有上次的消息，应该发送
  if (!lastProgressMessage) return true;

  // 如果播放状态变化，应该发送
  if (lastProgressMessage.isPlaying !== currentMessage.isPlaying) return true;

  // 如果播放速度变化，应该发送
  if (lastProgressMessage.playbackRate !== currentMessage.playbackRate) return true;

  // 如果进度变化超过0.5%，应该发送
  if (Math.abs(lastProgressMessage.percentage - currentMessage.percentage) >= 0.5) return true;

  // 如果时间变化超过1秒，应该发送
  if (Math.abs(lastProgressMessage.currentTime - currentMessage.currentTime) >= 1) return true;

  // 其他情况不发送
  return false;
}

/**
 * 发送视频进度消息
 * @param message 进度消息
 */
function sendVideoProgressMessage(message: VideoProgressMessage): void {
  try {
    // 使用chrome.runtime.sendMessage发送消息到扩展的其他部分
    chrome.runtime.sendMessage(message).catch(error => {
      // 忽略消息端口关闭错误，这通常是因为扩展重新加载或页面刷新
      if (!error.message?.includes('message port closed')) {
        console.error('发送视频进度消息失败:', error);
      }
    });
  } catch (error) {
    console.error('发送视频进度消息时出错:', error);
  }
}

/**
 * 设置视频事件监听器
 */
function setupVideoEventListeners(): void {
  const video = document.querySelector('video');
  if (!video) {
    console.warn('未找到视频元素，无法设置事件监听器');
    return;
  }

  // 定义事件处理函数
  const handlePlay = () => checkVideoProgress();
  const handlePause = () => checkVideoProgress();
  const handleSeeked = () => checkVideoProgress();
  const handleRateChange = () => checkVideoProgress();
  const handleVolumeChange = () => checkVideoProgress();
  const handleEnded = () => checkVideoProgress();

  // 添加事件监听器
  video.addEventListener('play', handlePlay);
  video.addEventListener('pause', handlePause);
  video.addEventListener('seeked', handleSeeked);
  video.addEventListener('ratechange', handleRateChange);
  video.addEventListener('volumechange', handleVolumeChange);
  video.addEventListener('ended', handleEnded);

  // 创建清理函数
  cleanupListeners = () => {
    if (video) {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
    }
  };
}
