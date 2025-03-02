// 添加调试信息
console.log('音频替换功能开始加载 - ' + new Date().toISOString());

// 全局变量，用于跟踪最后检测到的音量
let lastDetectedVolume = 0.5;

// 存储清理函数的变量
let currentAudioCleanup: (() => void) | null = null;

// 添加全局音频元素引用，便于其他函数访问
let currentReplacementAudio: HTMLAudioElement | null = null;
let isAudioReplaced = false;

// 确保在页面加载完成后初始化
function initializeAudioReplacer() {
  console.log('初始化音频替换功能');

  // 检查 chrome API 是否可用
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('chrome.runtime API 不可用，音频替换功能将不能正常工作');
    return;
  }

  // 确保消息监听器正确注册
  try {
    // 监听来自扩展的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('收到消息类型:', message.type);

      if (message.type === 'PING_CONTENT_SCRIPT') {
        // 响应ping请求，确认内容脚本已加载
        console.log('收到ping请求，确认内容脚本加载状态');
        sendResponse({ success: true });
        return true; // 使用true表示会异步发送响应
      } else if (message.type === 'REPLACE_YOUTUBE_AUDIO') {
        console.log('准备替换音频，文件名:', message.fileName, '类型:', message.fileType);

        // 如果已经有一个音频替换正在进行，先清理它
        if (currentAudioCleanup) {
          currentAudioCleanup();
          currentAudioCleanup = null;
          currentReplacementAudio = null;
          isAudioReplaced = false;
        }

        handleAudioReplace(message.audioData, message.fileName, message.fileType)
          .then(cleanup => {
            console.log('音频替换成功');
            // 保存清理函数
            currentAudioCleanup = cleanup;
            isAudioReplaced = true;
            sendResponse({ success: true });
            return cleanup;
          })
          .catch(error => {
            console.error('替换音频失败:', error);
            isAudioReplaced = false;
            currentReplacementAudio = null;
            sendResponse({ success: false, error: error.message });
          });
        return true; // 表示会异步发送响应
      } else if (message.type === 'RESTORE_YOUTUBE_AUDIO') {
        console.log('恢复原始音频');
        // 使用try-catch包裹清理过程，确保即使出错也能发送响应
        try {
          // 如果有清理函数，调用它
          if (currentAudioCleanup) {
            currentAudioCleanup();
            currentAudioCleanup = null;
            currentReplacementAudio = null;
            isAudioReplaced = false;
            sendResponse({ success: true });
          } else {
            console.warn('没有找到需要清理的音频替换');
            isAudioReplaced = false;
            currentReplacementAudio = null;
            sendResponse({ success: false, error: '没有找到活跃的音频替换' });
          }
        } catch (error) {
          console.error('执行音频清理过程中出错:', error);
          // 确保即使出错也发送响应
          isAudioReplaced = false;
          currentReplacementAudio = null;
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '恢复音频过程中出错',
          });
        }
        return true; // 表示会异步发送响应
      } else if (message.type === 'UPDATE_AUDIO_VOLUME') {
        // 处理音量更新请求
        console.log('收到音量更新请求:', message.volume);
        try {
          // 直接使用全局音频元素引用
          if (currentReplacementAudio && isAudioReplaced) {
            console.log('找到替换的音频元素，更新音量:', message.volume);
            currentReplacementAudio.volume = message.volume;
            lastDetectedVolume = message.volume;
            sendResponse({ success: true });
          } else {
            // 尝试查找当前活跃的音频元素
            const audioElements = document.querySelectorAll('audio');
            let found = false;

            // 遍历所有音频元素，查找我们的替换音频
            for (let i = 0; i < audioElements.length; i++) {
              const audio = audioElements[i];
              // 检查是否是我们的替换音频（通过检查src是否为data:开头的Base64数据）
              if (audio.src && audio.src.startsWith('data:')) {
                console.log('找到替换的音频元素，更新音量:', message.volume);
                audio.volume = message.volume;
                lastDetectedVolume = message.volume;
                // 更新全局引用
                currentReplacementAudio = audio;
                found = true;
                break;
              }
            }

            if (!found) {
              console.warn('未找到替换的音频元素');
              // 仍然更新全局音量变量，以便在音量检测中使用
              lastDetectedVolume = message.volume;
            }

            sendResponse({ success: found });
          }
        } catch (error) {
          console.error('更新音量失败:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '更新音量失败',
          });
        }
        return true;
      } else if (message.type === 'UPDATE_AUDIO_MUTED') {
        // 处理静音更新请求
        console.log('收到静音更新请求:', message.muted);
        try {
          // 直接使用全局音频元素引用
          if (currentReplacementAudio && isAudioReplaced) {
            console.log('找到替换的音频元素，更新静音状态:', message.muted);

            if (message.muted) {
              // 如果要静音，先记住当前音量
              lastDetectedVolume = currentReplacementAudio.volume;
              currentReplacementAudio.volume = 0;
            } else {
              // 如果要取消静音，恢复之前的音量
              currentReplacementAudio.volume = message.previousVolume || 0.75;
              lastDetectedVolume = currentReplacementAudio.volume;
            }

            sendResponse({ success: true });
          } else {
            // 查找当前活跃的音频元素
            const audioElements = document.querySelectorAll('audio');
            let found = false;

            // 遍历所有音频元素，查找我们的替换音频
            for (let i = 0; i < audioElements.length; i++) {
              const audio = audioElements[i];
              // 检查是否是我们的替换音频
              if (audio.src && audio.src.startsWith('data:')) {
                console.log('找到替换的音频元素，更新静音状态:', message.muted);

                if (message.muted) {
                  // 如果要静音，先记住当前音量
                  lastDetectedVolume = audio.volume;
                  audio.volume = 0;
                } else {
                  // 如果要取消静音，恢复之前的音量
                  audio.volume = message.previousVolume || 0.75;
                  lastDetectedVolume = audio.volume;
                }

                // 更新全局引用
                currentReplacementAudio = audio;
                found = true;
                break;
              }
            }

            if (!found) {
              console.warn('未找到替换的音频元素');
            }

            sendResponse({ success: found });
          }
        } catch (error) {
          console.error('更新静音状态失败:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : '更新静音状态失败',
          });
        }
        return true;
      } else if (message.type === 'GET_AUDIO_VOLUME') {
        // 获取当前音量状态
        console.log('收到获取音量状态请求');
        try {
          // 直接使用全局音频元素引用
          if (currentReplacementAudio && isAudioReplaced) {
            console.log('找到替换的音频元素，当前音量:', currentReplacementAudio.volume);
            sendResponse({
              volume: currentReplacementAudio.volume,
              muted: currentReplacementAudio.volume === 0,
            });
            return true;
          }

          // 查找当前活跃的音频元素
          const audioElements = document.querySelectorAll('audio');
          let found = false;
          let response = { volume: lastDetectedVolume, muted: lastDetectedVolume === 0 };

          // 遍历所有音频元素，查找我们的替换音频
          for (let i = 0; i < audioElements.length; i++) {
            const audio = audioElements[i];
            // 检查是否是我们的替换音频
            if (audio.src && audio.src.startsWith('data:')) {
              console.log('找到替换的音频元素，当前音量:', audio.volume);
              response = {
                volume: audio.volume,
                muted: audio.volume === 0,
              };
              // 更新全局引用
              currentReplacementAudio = audio;
              found = true;
              break;
            }
          }

          if (!found) {
            console.warn('未找到替换的音频元素，返回默认音量状态');
            // 如果有全局音量变量，使用它
            response.volume = lastDetectedVolume;
            response.muted = lastDetectedVolume === 0;
          }

          sendResponse(response);
        } catch (error) {
          console.error('获取音量状态失败:', error);
          sendResponse({
            volume: lastDetectedVolume,
            muted: lastDetectedVolume === 0,
            error: error instanceof Error ? error.message : '获取音量状态失败',
          });
        }
        return true;
      } else if (message.type === 'CHECK_AUDIO_REPLACED') {
        // 检查音频是否已替换
        sendResponse({
          replaced: isAudioReplaced,
          hasAudioElement: currentReplacementAudio !== null,
        });
        return true;
      }
      return false; // 处理其他类型的消息
    });
    console.log('消息监听器已成功注册');

    // 主动发送消息到后台脚本，确认音频替换功能已加载
    chrome.runtime
      .sendMessage({ type: 'AUDIO_REPLACER_LOADED' })
      .then(response => console.log('收到后台脚本响应:', response))
      .catch(error => console.error('发送消息到后台脚本失败:', error));
  } catch (error) {
    console.error('注册消息监听器时出错:', error);
  }
}

// 在页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAudioReplacer);
} else {
  // 如果页面已经加载完成，立即初始化
  initializeAudioReplacer();
}

// 为HTMLVideoElement添加audioTracks属性的类型定义
interface HTMLMediaElementWithAudioTracks extends HTMLVideoElement {
  audioTracks?: {
    length: number;
    [index: number]: {
      enabled: boolean;
    };
  };
}

async function handleAudioReplace(audioData: string, fileName: string, fileType: string) {
  // 获取 YouTube 视频元素
  const video = document.querySelector('video');
  if (!video) {
    throw new Error('未找到视频元素');
  }

  // 使用类型断言将video转换为包含audioTracks的类型
  const videoWithAudioTracks = video as HTMLMediaElementWithAudioTracks;

  // fileName和fileType参数用于调试和日志记录
  console.log(`找到视频元素，准备替换音频: ${fileName} (${fileType})`);

  try {
    // 直接使用 Base64 数据创建音频元素
    const audio = new Audio(audioData);

    // 设置全局音频元素引用
    currentReplacementAudio = audio;
    isAudioReplaced = true;

    // 为了确保音频可以正常访问，我们需要处理跨域问题
    audio.crossOrigin = 'anonymous';

    console.log('音频元素已创建，准备加载');

    // 确保音频已经加载完成再播放
    await new Promise((resolve, reject) => {
      // 设置超时时间，防止无限等待
      const timeout = setTimeout(() => {
        reject(new Error('音频加载超时'));
      }, 15000); // 15秒超时

      audio.addEventListener(
        'canplaythrough',
        () => {
          clearTimeout(timeout);
          resolve(null);
        },
        { once: true },
      );

      audio.addEventListener(
        'error',
        () => {
          clearTimeout(timeout);
          console.error('音频加载错误:', audio.error);
          reject(new Error(`音频加载失败: ${audio.error?.message || '未知错误'}`));
        },
        { once: true },
      );

      // 明确调用加载
      audio.load();
    });

    console.log('音频元素已准备就绪');

    // 记录原始音频状态
    const originalMutedState = video.muted;
    const originalVolume = video.volume;

    // 保存原始的音频轨道
    const originalAudioTracks: Array<{ enabled: boolean }> = [];

    // 尝试禁用视频的所有音频轨道
    try {
      if (videoWithAudioTracks.audioTracks && videoWithAudioTracks.audioTracks.length > 0) {
        console.log(`视频有 ${videoWithAudioTracks.audioTracks.length} 个音频轨道，尝试禁用`);

        // 保存原始状态
        for (let i = 0; i < videoWithAudioTracks.audioTracks.length; i++) {
          originalAudioTracks.push({
            enabled: videoWithAudioTracks.audioTracks[i].enabled,
          });

          // 禁用轨道
          if (videoWithAudioTracks.audioTracks[i].enabled) {
            console.log(`禁用音频轨道 ${i}`);
            videoWithAudioTracks.audioTracks[i].enabled = false;
          }
        }
      }
    } catch (error) {
      console.error('禁用音频轨道失败:', error);
    }

    // 强制设置视频静音
    video.muted = true;

    // 设置视频音量为0（不使用原始设置方法）
    video.volume = 0;

    // 创建一个标志，表示视频是否正在加载
    let isVideoLoading = false;

    // 监听视频加载状态
    const handleVideoWaiting = () => {
      console.log('视频正在加载，暂停替换的音频');
      isVideoLoading = true;
      audio.pause();
      // 这里可以触发UI显示加载状态的消息
      chrome.runtime
        .sendMessage({
          type: 'VIDEO_LOADING_STATE',
          isLoading: true,
        })
        .catch(err => console.error('发送加载状态消息失败:', err));
    };

    const handleVideoPlaying = () => {
      console.log('视频加载完成，继续播放替换的音频');
      isVideoLoading = false;

      // 再次确保视频是静音的
      ensureMuted();

      if (!video.paused) {
        audio.currentTime = video.currentTime;
        audio.play().catch(err => console.error('恢复播放音频失败:', err));
      }
      // 通知UI更新加载状态
      chrome.runtime
        .sendMessage({
          type: 'VIDEO_LOADING_STATE',
          isLoading: false,
        })
        .catch(err => console.error('发送加载状态消息失败:', err));
    };

    // 添加视频加载状态监听
    video.addEventListener('waiting', handleVideoWaiting);
    video.addEventListener('playing', handleVideoPlaying);

    // 同步播放状态
    const handlePlay = () => {
      // 再次确保视频是静音的
      ensureMuted();

      if (!isVideoLoading) {
        audio.currentTime = video.currentTime;
        audio.play().catch(err => console.error('播放音频失败:', err));
      }
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleSeeked = () => {
      // 再次确保视频是静音的
      ensureMuted();

      audio.currentTime = video.currentTime;
      if (!video.paused && !isVideoLoading) {
        audio.play().catch(err => console.error('跳转后播放音频失败:', err));
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);

    // 同步播放速度
    const handleRateChange = () => {
      audio.playbackRate = video.playbackRate;
    };

    video.addEventListener('ratechange', handleRateChange);

    // 彻底解决音量同步问题
    // 1. 确保视频始终保持静音状态
    const ensureMuted = () => {
      // 检查并强制设置静音
      if (!video.muted) {
        console.log('检测到视频非静音状态，重新设置为静音');
        video.muted = true;
      }

      // 检查并强制设置音量为0，但不影响替换音频的音量
      if (video.volume > 0) {
        console.log('检测到视频音量不为0，重新设置为0');
        // 暂时移除volumechange事件监听器，避免触发handleVolumeChange
        video.removeEventListener('volumechange', handleVolumeChange);
        // 设置视频音量为0
        video.volume = 0;
        // 重新添加事件监听器
        setTimeout(() => {
          video.addEventListener('volumechange', handleVolumeChange);
        }, 0);
      }

      // 检查并禁用所有音频轨道
      try {
        if (videoWithAudioTracks.audioTracks && videoWithAudioTracks.audioTracks.length > 0) {
          for (let i = 0; i < videoWithAudioTracks.audioTracks.length; i++) {
            if (videoWithAudioTracks.audioTracks[i].enabled) {
              console.log(`重新禁用音频轨道 ${i}`);
              videoWithAudioTracks.audioTracks[i].enabled = false;
            }
          }
        }
      } catch (error) {
        console.error('禁用音频轨道失败:', error);
      }
    };

    // 2. 使用更简单的方法处理音量变化
    const handleVolumeChange = () => {
      // 获取YouTube播放器的实际音量控制值
      // 这里我们需要从YouTube播放器的UI控制获取音量，而不是从video元素
      // 由于video.volume总是被我们设置为0，我们需要从其他地方获取实际音量

      // 尝试从YouTube播放器的音量控制器获取音量
      let newVolume = 0;
      try {
        // 查找YouTube播放器的音量控制器
        const volumePanel = document.querySelector('.ytp-volume-panel');
        if (volumePanel) {
          // 从aria-valuenow属性获取音量值(0-100)
          const volumeSlider = volumePanel.querySelector('.ytp-volume-slider');
          if (volumeSlider && volumeSlider.getAttribute('aria-valuenow')) {
            newVolume = parseInt(volumeSlider.getAttribute('aria-valuenow') || '0') / 100;
          }
        }

        // 如果无法从滑块获取，尝试从音量按钮获取
        if (newVolume === 0) {
          const volumeButton = document.querySelector('.ytp-mute-button');
          if (volumeButton) {
            // 检查是否静音
            const isMuted =
              volumeButton.getAttribute('data-title-no-tooltip')?.includes('取消静音') ||
              volumeButton.getAttribute('aria-label')?.includes('取消静音') ||
              volumeButton.getAttribute('title')?.includes('取消静音');

            if (isMuted) {
              // 如果是静音状态，设置音量为0
              newVolume = 0;
            } else {
              // 尝试从其他元素获取音量信息
              const volumePercent = document.querySelector('.ytp-volume-panel')?.getAttribute('aria-valuetext');
              if (volumePercent) {
                // 尝试从百分比文本中提取数字
                const match = volumePercent.match(/(\d+)%/);
                if (match && match[1]) {
                  newVolume = parseInt(match[1]) / 100;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('获取YouTube音量控制器失败:', error);
      }

      // 如果无法从UI获取，则使用一个默认值或保持当前音量
      if (newVolume === 0 && audio.volume > 0) {
        // 检查是否是真正的静音操作
        const volumeButton = document.querySelector('.ytp-mute-button');
        const isMuted =
          volumeButton?.getAttribute('data-title-no-tooltip')?.includes('取消静音') ||
          volumeButton?.getAttribute('aria-label')?.includes('取消静音') ||
          volumeButton?.getAttribute('title')?.includes('取消静音');

        if (isMuted) {
          // 如果确实是静音操作，设置音量为0
          console.log('检测到YouTube静音操作，设置音频音量为0');
          audio.volume = 0;
          lastDetectedVolume = audio.volume;
          return;
        } else {
          // 无法获取音量但不是静音操作，保持当前音量
          console.log('无法从YouTube获取音量，保持当前音量:', audio.volume);
          return;
        }
      }

      console.log(`音量变化: ${audio.volume} -> ${newVolume}`);

      // 确保视频保持静音
      ensureMuted();

      // 设置音频音量
      audio.volume = newVolume;
      // 更新全局音量变量
      lastDetectedVolume = newVolume;

      // 确保全局引用是最新的
      currentReplacementAudio = audio;
    };

    // 添加一个直接监听YouTube音量按钮点击的事件
    const setupVolumeButtonListener = () => {
      const volumeButton = document.querySelector('.ytp-mute-button');
      if (volumeButton) {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (
              mutation.type === 'attributes' &&
              (mutation.attributeName === 'data-title-no-tooltip' ||
                mutation.attributeName === 'aria-label' ||
                mutation.attributeName === 'title')
            ) {
              // 检查是否静音
              const isMuted =
                volumeButton.getAttribute('data-title-no-tooltip')?.includes('取消静音') ||
                volumeButton.getAttribute('aria-label')?.includes('取消静音') ||
                volumeButton.getAttribute('title')?.includes('取消静音');

              console.log('检测到音量按钮状态变化:', isMuted ? '静音' : '非静音');

              if (isMuted) {
                // 如果是静音状态，设置音量为0
                audio.volume = 0;
              } else {
                // 如果取消静音，尝试恢复之前的音量
                const volumeSlider = document.querySelector('.ytp-volume-slider');
                if (volumeSlider && volumeSlider.getAttribute('aria-valuenow')) {
                  const newVolume = parseInt(volumeSlider.getAttribute('aria-valuenow') || '0') / 100;
                  if (newVolume > 0) {
                    audio.volume = newVolume;
                  } else {
                    // 如果滑块值为0但取消了静音，保持当前音量而不是使用默认值
                    // 不做任何操作，保持当前音量
                    console.log('滑块值为0但取消了静音，保持当前音量:', audio.volume);
                  }
                } else {
                  // 如果无法获取滑块值，保持当前音量而不是使用默认值
                  console.log('无法获取滑块值，保持当前音量:', audio.volume);
                }
              }

              // 更新全局音量变量
              lastDetectedVolume = audio.volume;

              // 确保全局引用是最新的
              currentReplacementAudio = audio;
            }
          });
        });

        observer.observe(volumeButton, { attributes: true });

        // 返回清理函数
        return () => observer.disconnect();
      }
      return null;
    };

    // 设置音量滑块监听
    const setupVolumeSliderListener = () => {
      const volumeSlider = document.querySelector('.ytp-volume-slider');
      if (volumeSlider) {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-valuenow') {
              const newVolume = parseInt(volumeSlider.getAttribute('aria-valuenow') || '0') / 100;
              console.log('检测到音量滑块变化:', newVolume);

              // 设置音频音量
              audio.volume = newVolume;
              // 更新全局音量变量
              lastDetectedVolume = newVolume;

              // 确保全局引用是最新的
              currentReplacementAudio = audio;
            }
          });
        });

        observer.observe(volumeSlider, { attributes: true });

        // 返回清理函数
        return () => observer.disconnect();
      }
      return null;
    };

    // 3. 添加定期检查，确保视频始终保持静音状态
    const mutedCheckInterval = setInterval(ensureMuted, 200); // 更频繁地检查

    // 4. 监听音量变化事件
    video.addEventListener('volumechange', handleVolumeChange);

    // 5. 初始化音量 - 尝试从YouTube播放器获取当前音量
    let initialVolume = 0;
    try {
      // 尝试从YouTube播放器的音量控制器获取初始音量
      const volumePanel = document.querySelector('.ytp-volume-panel');
      if (volumePanel) {
        const volumeSlider = volumePanel.querySelector('.ytp-volume-slider');
        if (volumeSlider && volumeSlider.getAttribute('aria-valuenow')) {
          initialVolume = parseInt(volumeSlider.getAttribute('aria-valuenow') || '0') / 100;
          console.log('从YouTube播放器获取到初始音量:', initialVolume);
        }
      }
    } catch (error) {
      console.error('获取初始音量失败:', error);
    }

    // 如果无法从YouTube获取，则使用全局记录的音量或原始音量
    audio.volume =
      initialVolume > 0
        ? initialVolume
        : lastDetectedVolume > 0
          ? lastDetectedVolume
          : originalVolume > 0
            ? originalVolume
            : 0.5;
    console.log('设置初始音量:', audio.volume);

    // 更新全局音量变量
    lastDetectedVolume = audio.volume;

    ensureMuted(); // 确保初始状态为静音

    // 设置音量按钮和滑块监听器
    const volumeButtonCleanup = setupVolumeButtonListener();
    const volumeSliderCleanup = setupVolumeSliderListener();

    // 清理函数
    const cleanup = () => {
      console.log('清理音频替换');

      // 清除定期检查静音状态的定时器
      clearInterval(mutedCheckInterval);

      // 先移除事件监听器，避免在恢复过程中触发
      video.removeEventListener('waiting', handleVideoWaiting);
      video.removeEventListener('playing', handleVideoPlaying);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', cleanup);

      // 清理音量按钮和滑块监听器
      if (volumeButtonCleanup) volumeButtonCleanup();
      if (volumeSliderCleanup) volumeSliderCleanup();

      // 恢复原始音频轨道状态
      try {
        if (videoWithAudioTracks.audioTracks && originalAudioTracks.length > 0) {
          console.log('恢复原始音频轨道状态');
          for (let i = 0; i < Math.min(videoWithAudioTracks.audioTracks.length, originalAudioTracks.length); i++) {
            videoWithAudioTracks.audioTracks[i].enabled = originalAudioTracks[i].enabled;
          }
        }
      } catch (error) {
        console.error('恢复音频轨道状态失败:', error);
      }

      // 暂停并移除音频元素
      audio.pause();
      audio.remove();

      // 恢复原始音量和静音状态
      console.log(`恢复原始音量: ${originalVolume} 和静音状态: ${originalMutedState}`);
      video.volume = originalVolume;
      video.muted = originalMutedState;

      // 重置全局引用
      currentReplacementAudio = null;
      isAudioReplaced = false;

      // 通知UI更新状态
      chrome.runtime
        .sendMessage({
          type: 'VIDEO_LOADING_STATE',
          isLoading: false,
        })
        .catch(() => {
          /* 忽略可能的错误 */
        });
    };

    // 监听视频结束
    video.addEventListener('ended', cleanup, { once: true });

    // 如果当前视频正在播放，立即播放音频
    if (!video.paused) {
      // 检查视频是否处于缓冲状态
      if (video.readyState < 3) {
        console.log('视频正在缓冲，等待加载完成后再播放音频');
        isVideoLoading = true;
        // 通知UI显示加载状态
        chrome.runtime
          .sendMessage({
            type: 'VIDEO_LOADING_STATE',
            isLoading: true,
          })
          .catch(err => console.error('发送加载状态消息失败:', err));
      } else {
        audio.currentTime = video.currentTime;
        await audio.play().catch(err => console.error('初始播放音频失败:', err));
        console.log('音频已开始播放');
      }
    }

    // 返回清理函数，以便在需要时恢复原始音频
    return cleanup;
  } catch (error) {
    console.error('音频处理过程中出错:', error);
    throw error; // 重新抛出异常以便上层处理
  }
}
