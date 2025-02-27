import type { AudioQuality, Language, Speed } from '../types';

// 语音语言选项
export const languageOptions: { key: Language; label: string }[] = [
  { key: 'zh-cn', label: '中文 (中国)' },
  { key: 'zh-tw', label: '中文 (台湾)' },
  { key: 'en-us', label: '英语 (美国)' },
  { key: 'en-gb', label: '英语 (英国)' },
  { key: 'ja-jp', label: '日语' },
  { key: 'ko-kr', label: '韩语' },
  { key: 'fr-fr', label: '法语' },
  { key: 'de-de', label: '德语' },
  { key: 'ru-ru', label: '俄语' },
];

// 语速选项
export const speedOptions: { key: Speed; label: string }[] = [
  { key: '-10', label: '极慢' },
  { key: '-5', label: '较慢' },
  { key: '-2', label: '稍慢' },
  { key: '0', label: '正常' },
  { key: '2', label: '稍快' },
  { key: '5', label: '较快' },
  { key: '10', label: '极快' },
];

// 音频质量选项
export const audioQualityOptions: { key: AudioQuality; label: string }[] = [
  { key: '8khz_8bit_mono', label: '低质量 (8khz 8bit 单声道)' },
  { key: '16khz_16bit_mono', label: '中等质量 (16khz 16bit 单声道)' },
  { key: '16khz_16bit_stereo', label: '高质量 (16khz 16bit 立体声)' },
  { key: '22khz_16bit_mono', label: '超高质量 (22khz 16bit 单声道)' },
  { key: '22khz_16bit_stereo', label: '最高质量 (22khz 16bit 立体声)' },
];
