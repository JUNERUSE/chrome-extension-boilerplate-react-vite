// 为HTMLVideoElement添加audioTracks属性的类型定义
export interface HTMLMediaElementWithAudioTracks extends HTMLMediaElement {
  audioTracks?: {
    length: number;
    [index: number]: {
      enabled: boolean;
    };
    [key: string]: unknown;
  };
}

// 消息类型定义
export type MessageType =
  | 'PING_CONTENT_SCRIPT'
  | 'REPLACE_YOUTUBE_AUDIO'
  | 'RESTORE_YOUTUBE_AUDIO'
  | 'UPDATE_AUDIO_VOLUME'
  | 'UPDATE_AUDIO_MUTED'
  | 'GET_AUDIO_VOLUME'
  | 'CHECK_AUDIO_REPLACED'
  | 'VIDEO_LOADING_STATE'
  | 'AUDIO_REPLACER_LOADED';

// 消息接口
export interface Message {
  type: MessageType;
  [key: string]: unknown;
}

// 音频替换消息
export interface ReplaceAudioMessage extends Message {
  type: 'REPLACE_YOUTUBE_AUDIO';
  audioData: string;
  fileName: string;
  fileType: string;
}

// 音量更新消息
export interface UpdateVolumeMessage extends Message {
  type: 'UPDATE_AUDIO_VOLUME';
  volume: number;
}

// 静音更新消息
export interface UpdateMutedMessage extends Message {
  type: 'UPDATE_AUDIO_MUTED';
  muted: boolean;
  previousVolume?: number;
}

// 视频加载状态消息
export interface VideoLoadingStateMessage extends Message {
  type: 'VIDEO_LOADING_STATE';
  isLoading: boolean;
}

/**
 * 音频替换器状态接口
 */
export interface AudioReplacerState {
  /** 是否已替换音频 */
  isAudioReplaced: boolean;
  /** 替换的音频元素 */
  replacementAudio: HTMLAudioElement | null;
  /** 最后检测到的音量 */
  lastDetectedVolume: number;
  /** 清理函数 */
  cleanup: (() => void) | null;
}
