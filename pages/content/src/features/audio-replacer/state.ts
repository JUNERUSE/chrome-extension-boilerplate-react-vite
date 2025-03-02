import type { AudioReplacerState } from './types';

// 音频替换状态
const audioReplacerState: AudioReplacerState = {
  isAudioReplaced: false,
  replacementAudio: null,
  lastDetectedVolume: 0.5, // 默认音量
  cleanup: null,
};

/**
 * 获取当前状态
 */
export function getState(): AudioReplacerState {
  return audioReplacerState;
}

/**
 * 更新音量
 */
export function updateVolume(volume: number): void {
  audioReplacerState.lastDetectedVolume = volume;
}

/**
 * 更新替换音频元素
 */
export function updateReplacementAudio(audio: HTMLAudioElement | null): void {
  audioReplacerState.replacementAudio = audio;
}

/**
 * 更新音频替换状态
 */
export function updateAudioReplaced(isReplaced: boolean): void {
  audioReplacerState.isAudioReplaced = isReplaced;
}

/**
 * 更新清理函数
 */
export function updateCleanup(cleanup: (() => void) | null): void {
  audioReplacerState.cleanup = cleanup;
}

// 执行清理
export function executeCleanup(): boolean {
  if (audioReplacerState.cleanup) {
    audioReplacerState.cleanup();
    audioReplacerState.cleanup = null;
    audioReplacerState.replacementAudio = null;
    audioReplacerState.isAudioReplaced = false;
    return true;
  }
  return false;
}

// 重置状态
export function resetState(): void {
  executeCleanup();
  audioReplacerState.lastDetectedVolume = 0.5;
  audioReplacerState.cleanup = null;
  audioReplacerState.replacementAudio = null;
  audioReplacerState.isAudioReplaced = false;
}
