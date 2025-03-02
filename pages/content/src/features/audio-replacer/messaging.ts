import { getState } from './state';

/**
 * 发送视频加载状态到侧边栏
 * @param isLoading 是否正在加载
 */
export function sendVideoLoadingState(isLoading: boolean): void {
  try {
    chrome.runtime.sendMessage({
      type: 'VIDEO_LOADING_STATE',
      isLoading,
    });
    console.log('已发送视频加载状态:', isLoading);
  } catch (error) {
    console.error('发送视频加载状态失败:', error);
  }
}

/**
 * 发送音频替换状态消息到侧边栏
 */
export function sendAudioReplacementState(): void {
  try {
    const state = getState();
    chrome.runtime.sendMessage({
      type: 'AUDIO_REPLACEMENT_STATE',
      isReplaced: state.isAudioReplaced,
    });
    console.log('已发送音频替换状态:', state.isAudioReplaced);
  } catch (error) {
    console.error('发送音频替换状态消息失败:', error);
  }
}

/**
 * 设置消息监听器
 * @param handleAudioReplace 音频替换处理函数
 */
export function setupMessageListeners(
  handleAudioReplace: (audioData: string, fileName: string, fileType: string) => Promise<() => void>,
): void {
  console.log('设置消息监听器');

  // 监听来自扩展的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message.type);

    // 处理ping消息，用于检查内容脚本是否正常运行
    if (message.type === 'PING_CONTENT_SCRIPT') {
      console.log('收到ping消息，回复成功');
      sendResponse({ success: true });
      return true; // 保持消息通道开放
    }

    // 处理替换YouTube音频的消息
    if (message.type === 'REPLACE_YOUTUBE_AUDIO') {
      console.log('收到替换音频请求');

      // 验证消息数据
      if (!message.audioData || !message.fileName || !message.fileType) {
        console.error('替换音频请求缺少必要参数');
        sendResponse({ success: false, error: '缺少必要参数' });
        return true;
      }

      // 异步处理音频替换
      handleAudioReplace(message.audioData, message.fileName, message.fileType)
        .then(cleanup => {
          // 保存清理函数到状态
          const state = getState();
          state.cleanup = cleanup;

          console.log('音频替换成功，发送响应');
          sendResponse({ success: true });

          // 发送状态更新
          sendAudioReplacementState();
        })
        .catch(error => {
          console.error('音频替换失败:', error);
          sendResponse({ success: false, error: error.message || '替换失败' });
        });

      return true; // 保持消息通道开放，等待异步操作完成
    }

    // 处理恢复原始音频的消息
    if (message.type === 'RESTORE_YOUTUBE_AUDIO') {
      console.log('收到恢复原音频请求');

      const state = getState();
      if (state.cleanup && typeof state.cleanup === 'function') {
        try {
          // 执行清理函数
          state.cleanup();
          console.log('原音频已恢复');
          sendResponse({ success: true });

          // 发送状态更新
          sendAudioReplacementState();
        } catch (error) {
          console.error('恢复原音频失败:', error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : '恢复失败' });
        }
      } else {
        console.log('没有需要恢复的音频');
        sendResponse({ success: true });
      }

      return true; // 保持消息通道开放
    }

    // 处理检查音频是否已替换的消息
    if (message.type === 'CHECK_AUDIO_REPLACED') {
      console.log('收到检查音频替换状态请求');

      const state = getState();
      const isReplaced = state.isAudioReplaced;
      console.log('当前音频替换状态:', isReplaced);

      sendResponse({
        success: true,
        isReplaced: isReplaced,
      });

      return true; // 保持消息通道开放
    }

    // 未知消息类型
    console.warn('收到未知类型的消息:', message.type);
    return false; // 不保持消息通道开放
  });
}
