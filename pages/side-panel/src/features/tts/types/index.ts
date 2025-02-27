export interface JobResponse {
  id: string;
  status: string;
  eta: number;
  text: string;
}

export interface TTSResponse {
  id: string;
  status: string;
  url: string;
  job_time: number;
  releaseUrl?: () => void; // 用于释放blob URL资源的函数
}

export type Language = 'zh-cn' | 'zh-tw' | 'en-us' | 'en-gb' | 'ja-jp' | 'ko-kr' | 'fr-fr' | 'de-de' | 'ru-ru';

export type AudioQuality =
  | '8khz_8bit_mono'
  | '16khz_16bit_mono'
  | '16khz_16bit_stereo'
  | '22khz_16bit_mono'
  | '22khz_16bit_stereo';

export type Speed = '-10' | '-5' | '-2' | '0' | '2' | '5' | '10';

// Voice RSS API 参数接口
export interface VoiceRSSParams {
  src: string; // 要转换的文本内容
  hl: Language; // 语言和区域代码 (如 'en-us', 'zh-cn')
  r: Speed; // 朗读速度 (-10 到 10)
  c: AudioQuality; // 编码格式 (如 'mp3', 'wav')
  f: AudioQuality; // 音频质量 (如 '8khz_8bit_mono', '16khz_16bit_stereo')
  key?: string; // Voice RSS API 密钥
}
