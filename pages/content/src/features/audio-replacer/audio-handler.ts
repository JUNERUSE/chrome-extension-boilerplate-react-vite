import { sendVideoLoadingState } from './messaging';
import { getState, updateAudioReplaced, updateCleanup, updateReplacementAudio, updateVolume } from './state';
import type { HTMLMediaElementWithAudioTracks } from './types';

/**
 * 处理音频替换
 * @param audioData Base64编码的音频数据
 * @param fileName 文件名（用于日志）
 * @param fileType 文件类型
 * @returns 清理函数
 */
export async function handleAudioReplace(audioData: string, fileName: string, fileType: string): Promise<() => void> {
  console.log('开始处理音频替换请求');

  try {
    // 获取 YouTube 视频元素
    const video = document.querySelector('video');
    if (!video) {
      console.error('未找到视频元素');
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
      updateReplacementAudio(audio);
      updateAudioReplaced(true);

      // 为了确保音频可以正常访问，我们需要处理跨域问题
      audio.crossOrigin = 'anonymous';

      console.log('音频元素已创建，准备加载');

      // 确保音频已经加载完成再播放
      await loadAudio(audio);

      console.log('音频元素已准备就绪');

      // 记录原始音频状态
      const originalMutedState = video.muted;
      const originalVolume = video.volume;

      // 保存原始的音频轨道
      const originalAudioTracks: Array<{ enabled: boolean }> = [];

      // 尝试禁用视频的所有音频轨道
      disableAudioTracks(videoWithAudioTracks, originalAudioTracks);

      // 强制设置视频静音
      video.muted = true;

      // 设置视频音量为0（不使用原始设置方法）
      video.volume = 0;

      // 创建一个标志，表示视频是否正在加载
      const isVideoLoading = false;

      // 设置视频事件监听器
      const eventHandlers = setupVideoEventListeners(video, audio, isVideoLoading);
      const {
        handleVideoWaiting,
        handleVideoPlaying,
        handlePlay,
        handlePause,
        handleSeeked,
        handleRateChange,
        handleVolumeChange,
      } = eventHandlers;

      // 添加视频加载状态监听
      video.addEventListener('waiting', handleVideoWaiting);
      video.addEventListener('playing', handleVideoPlaying);

      // 同步播放状态
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('seeked', handleSeeked);

      // 同步播放速度
      video.addEventListener('ratechange', handleRateChange);

      // 彻底解决音量同步问题
      // 1. 确保视频始终保持静音状态
      const ensureMuted = createEnsureMutedFunction(video, videoWithAudioTracks, handleVolumeChange);

      // 3. 添加定期检查，确保视频始终保持静音状态
      const mutedCheckInterval = window.setInterval(ensureMuted, 200); // 更频繁地检查

      // 4. 监听音量变化事件
      video.addEventListener('volumechange', handleVolumeChange);

      // 5. 初始化音量
      initializeAudioVolume(audio, originalVolume);

      ensureMuted(); // 确保初始状态为静音

      // 设置音量按钮和滑块监听器
      const volumeButtonCleanup = setupVolumeButtonListener(audio);
      const volumeSliderCleanup = setupVolumeSliderListener(audio);

      // 创建清理函数
      const cleanup = createCleanupFunction(
        video,
        audio,
        videoWithAudioTracks,
        originalAudioTracks,
        originalVolume,
        originalMutedState,
        mutedCheckInterval,
        {
          handleVideoWaiting,
          handleVideoPlaying,
          handlePlay,
          handlePause,
          handleSeeked,
          handleRateChange,
          handleVolumeChange,
        },
        volumeButtonCleanup,
        volumeSliderCleanup,
      );

      // 保存清理函数到状态
      updateCleanup(cleanup);

      // 监听视频结束
      video.addEventListener('ended', () => cleanup(), { once: true });

      // 如果当前视频正在播放，立即播放音频
      await handleInitialPlayback(video, audio);

      console.log('音频替换成功完成');

      // 返回清理函数，以便在需要时恢复原始音频
      return cleanup;
    } catch (error) {
      console.error('音频处理过程中出错:', error);
      // 重置状态
      updateAudioReplaced(false);
      updateReplacementAudio(null);
      throw error; // 重新抛出异常以便上层处理
    }
  } catch (error) {
    console.error('音频替换失败:', error);
    throw error; // 重新抛出异常以便上层处理
  }
}

/**
 * 加载音频
 */
async function loadAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // 设置超时时间，防止无限等待
    const timeout = setTimeout(() => {
      reject(new Error('音频加载超时'));
    }, 15000); // 15秒超时

    audio.addEventListener(
      'canplaythrough',
      () => {
        clearTimeout(timeout);
        resolve();
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
}

/**
 * 禁用视频的音频轨道
 */
function disableAudioTracks(
  videoWithAudioTracks: HTMLMediaElementWithAudioTracks,
  originalAudioTracks: Array<{ enabled: boolean }>,
): void {
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
}

/**
 * 设置视频事件监听器
 */
function setupVideoEventListeners(
  video: HTMLVideoElement,
  audio: HTMLAudioElement,
  isVideoLoading: boolean,
): {
  handleVideoWaiting: () => void;
  handleVideoPlaying: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleSeeked: () => void;
  handleRateChange: () => void;
  handleVolumeChange: () => void;
} {
  // 创建一个引用，以便在闭包中修改
  const state = { isVideoLoading };

  // 监听视频加载状态
  const handleVideoWaiting = () => {
    console.log('视频正在加载，暂停替换的音频');
    state.isVideoLoading = true;
    audio.pause();
    // 这里可以触发UI显示加载状态的消息
    sendVideoLoadingState(true);
  };

  const handleVideoPlaying = () => {
    console.log('视频加载完成，继续播放替换的音频');
    state.isVideoLoading = false;

    // 再次确保视频是静音的
    ensureMuted();

    if (!video.paused) {
      audio.currentTime = video.currentTime;
      audio.play().catch(err => console.error('恢复播放音频失败:', err));
    }
    // 通知UI更新加载状态
    sendVideoLoadingState(false);
  };

  // 同步播放状态
  const handlePlay = () => {
    // 再次确保视频是静音的
    ensureMuted();

    if (!state.isVideoLoading) {
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
    if (!video.paused && !state.isVideoLoading) {
      audio.play().catch(err => console.error('跳转后播放音频失败:', err));
    }
  };

  // 同步播放速度
  const handleRateChange = () => {
    audio.playbackRate = video.playbackRate;
  };

  // 确保视频始终保持静音状态
  const ensureMuted = createEnsureMutedFunction(video, video as HTMLMediaElementWithAudioTracks);

  // 处理音量变化
  const handleVolumeChange = () => {
    // 获取YouTube播放器的实际音量控制值
    const newVolume = getYouTubePlayerVolume(audio);

    // 确保视频保持静音
    ensureMuted();

    // 设置音频音量
    if (newVolume !== null) {
      audio.volume = newVolume;
      // 更新全局音量变量
      updateVolume(newVolume);
    }

    // 确保全局引用是最新的
    updateReplacementAudio(audio);
  };

  return {
    handleVideoWaiting,
    handleVideoPlaying,
    handlePlay,
    handlePause,
    handleSeeked,
    handleRateChange,
    handleVolumeChange,
  };
}

/**
 * 创建确保视频静音的函数
 */
function createEnsureMutedFunction(
  video: HTMLVideoElement,
  videoWithAudioTracks: HTMLMediaElementWithAudioTracks,
  handleVolumeChange?: () => void,
): () => void {
  return () => {
    // 检查并强制设置静音
    if (!video.muted) {
      console.log('检测到视频非静音状态，重新设置为静音');
      video.muted = true;
    }

    // 检查并强制设置音量为0，但不影响替换音频的音量
    if (video.volume > 0) {
      console.log('检测到视频音量不为0，重新设置为0');
      // 暂时移除volumechange事件监听器，避免触发handleVolumeChange
      if (handleVolumeChange) {
        video.removeEventListener('volumechange', handleVolumeChange);
      }
      // 设置视频音量为0
      video.volume = 0;
      // 重新添加事件监听器
      if (handleVolumeChange) {
        setTimeout(() => {
          video.addEventListener('volumechange', handleVolumeChange);
        }, 0);
      }
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
}

/**
 * 获取YouTube播放器的音量
 */
function getYouTubePlayerVolume(audio: HTMLAudioElement): number | null {
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
    return null;
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
      return 0;
    } else {
      // 无法获取音量但不是静音操作，保持当前音量
      console.log('无法从YouTube获取音量，保持当前音量:', audio.volume);
      return null;
    }
  }

  console.log(`音量变化: ${audio.volume} -> ${newVolume}`);
  return newVolume;
}

/**
 * 设置音量按钮监听器
 */
function setupVolumeButtonListener(audio: HTMLAudioElement): (() => void) | null {
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
          updateVolume(audio.volume);

          // 确保全局引用是最新的
          updateReplacementAudio(audio);
        }
      });
    });

    observer.observe(volumeButton, { attributes: true });

    // 返回清理函数
    return () => observer.disconnect();
  }
  return null;
}

/**
 * 设置音量滑块监听器
 */
function setupVolumeSliderListener(audio: HTMLAudioElement): (() => void) | null {
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
          updateVolume(newVolume);

          // 确保全局引用是最新的
          updateReplacementAudio(audio);
        }
      });
    });

    observer.observe(volumeSlider, { attributes: true });

    // 返回清理函数
    return () => observer.disconnect();
  }
  return null;
}

/**
 * 初始化音频音量
 */
function initializeAudioVolume(audio: HTMLAudioElement, originalVolume: number): void {
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
  const state = getState();
  audio.volume =
    initialVolume > 0
      ? initialVolume
      : state.lastDetectedVolume > 0
        ? state.lastDetectedVolume
        : originalVolume > 0
          ? originalVolume
          : 0.5;
  console.log('设置初始音量:', audio.volume);

  // 更新全局音量变量
  updateVolume(audio.volume);
}

/**
 * 创建清理函数
 */
function createCleanupFunction(
  video: HTMLVideoElement,
  audio: HTMLAudioElement,
  videoWithAudioTracks: HTMLMediaElementWithAudioTracks,
  originalAudioTracks: Array<{ enabled: boolean }>,
  originalVolume: number,
  originalMutedState: boolean,
  mutedCheckInterval: number,
  eventHandlers: {
    handleVideoWaiting: () => void;
    handleVideoPlaying: () => void;
    handlePlay: () => void;
    handlePause: () => void;
    handleSeeked: () => void;
    handleRateChange: () => void;
    handleVolumeChange: () => void;
  },
  volumeButtonCleanup: (() => void) | null,
  volumeSliderCleanup: (() => void) | null,
): () => void {
  const cleanupFunction = () => {
    console.log('清理音频替换');

    // 清除定期检查静音状态的定时器
    clearInterval(mutedCheckInterval);

    // 先移除事件监听器，避免在恢复过程中触发
    video.removeEventListener('waiting', eventHandlers.handleVideoWaiting);
    video.removeEventListener('playing', eventHandlers.handleVideoPlaying);
    video.removeEventListener('play', eventHandlers.handlePlay);
    video.removeEventListener('pause', eventHandlers.handlePause);
    video.removeEventListener('seeked', eventHandlers.handleSeeked);
    video.removeEventListener('ratechange', eventHandlers.handleRateChange);
    video.removeEventListener('volumechange', eventHandlers.handleVolumeChange);
    video.removeEventListener('ended', () => cleanupFunction());

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
    updateReplacementAudio(null);
    updateAudioReplaced(false);
    updateCleanup(null);

    // 通知UI更新状态
    sendVideoLoadingState(false);
  };

  return cleanupFunction;
}

/**
 * 处理初始播放
 */
async function handleInitialPlayback(video: HTMLVideoElement, audio: HTMLAudioElement): Promise<void> {
  // 如果当前视频正在播放，立即播放音频
  if (!video.paused) {
    // 检查视频是否处于缓冲状态
    if (video.readyState < 3) {
      console.log('视频正在缓冲，等待加载完成后再播放音频');
      // 通知UI显示加载状态
      sendVideoLoadingState(true);
    } else {
      audio.currentTime = video.currentTime;
      await audio.play().catch(err => console.error('初始播放音频失败:', err));
      console.log('音频已开始播放');
    }
  }
}
