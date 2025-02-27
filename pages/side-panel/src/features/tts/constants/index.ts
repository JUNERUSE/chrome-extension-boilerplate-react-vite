import type { VoiceRSSParams } from '../types';

/**
 * TTS API 的基础 URL
 * Voice RSS API 使用 POST 请求，直接返回音频内容
 */
export const TTS_API_URL = 'https://voicerss-text-to-speech.p.rapidapi.com/';

/**
 * Voice RSS API 密钥
 */
export const TTS_API_KEY = 'f78d24d12cc14324a81b915bfc8781de';

/**
 * RapidAPI 密钥
 */
export const RAPID_API_KEY = '3067f3324bmsh5bcd97c28263c60p1bc70djsn59db1d6b588c';

/**
 * RapidAPI 主机名
 */
export const TTS_API_HOST = 'voicerss-text-to-speech.p.rapidapi.com';

/**
 * 用于 TTS API 请求的标准请求头
 */
export const TTS_API_HEADERS = {
  'x-rapidapi-key': RAPID_API_KEY,
  'x-rapidapi-host': TTS_API_HOST,
  'Content-Type': 'application/x-www-form-urlencoded',
  accept: 'application/json',
};

/**
 * 默认语音设置
 */
export const DEFAULT_VOICE_SETTINGS: Pick<VoiceRSSParams, 'hl' | 'r' | 'f'> & { c: 'mp3' } = {
  hl: 'en-us', // 默认英文发音
  r: '0', // 语速 (0 = 正常)
  c: 'mp3', // 输出格式
  f: '8khz_8bit_mono', // 音频质量
};
