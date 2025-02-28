// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REPLACE_YOUTUBE_AUDIO') {
    handleAudioReplace(message.audioUrl)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('替换音频失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 表示会异步发送响应
  }
  return false; // 处理其他类型的消息
});

async function handleAudioReplace(newAudioUrl: string) {
  // 获取 YouTube 视频元素
  const video = document.querySelector('video');
  if (!video) {
    throw new Error('未找到视频元素');
  }

  // 创建新的音频元素
  const audio = new Audio(newAudioUrl);

  // 保存原始音频
  video.muted = true;

  // 同步播放状态
  video.addEventListener('play', () => {
    audio.currentTime = video.currentTime;
    audio.play();
  });

  video.addEventListener('pause', () => {
    audio.pause();
  });

  video.addEventListener('seeked', () => {
    audio.currentTime = video.currentTime;
  });

  // 同步播放速度
  video.addEventListener('ratechange', () => {
    audio.playbackRate = video.playbackRate;
  });

  // 同步音量
  const volumeObserver = new MutationObserver(() => {
    const volume = video.volume;
    audio.volume = volume;
  });

  volumeObserver.observe(video, {
    attributes: true,
    attributeFilter: ['volume'],
  });

  // 清理函数
  const cleanup = () => {
    video.muted = false;
    volumeObserver.disconnect();
    audio.pause();
    audio.remove();
  };

  // 监听视频结束
  video.addEventListener('ended', cleanup, { once: true });

  // 返回清理函数，以便在需要时恢复原始音频
  return cleanup;
}
