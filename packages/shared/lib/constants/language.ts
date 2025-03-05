/**
 * 映射YouTube字幕的languageCode到标准语言代码
 * 这个映射表将YouTube字幕API中的languageCode映射到标准的语言-国家代码
 */
export const LANGUAGE_CODE_MAPPING: Record<string, string> = {
  // 阿拉伯语
  ar: 'ar-SA',

  // 德语
  de: 'de-DE',

  // 英语
  en: 'en-US',

  // 西班牙语
  es: 'es-ES',

  // 法语
  fr: 'fr-FR',

  // 日语
  ja: 'ja-JP',

  // 韩语
  ko: 'ko-KR',

  // 葡萄牙语
  pt: 'pt-BR',
  'pt-PT': 'pt-BR', // 葡萄牙语（葡萄牙）也映射到pt-BR

  // 俄语
  ru: 'ru-RU',

  // 中文（简体）
  'zh-Hans': 'zh-CN',

  // 中文（繁体）
  'zh-Hant': 'zh-TW',
};

/**
 * 反向映射：从标准语言代码到YouTube languageCode
 */
export const REVERSE_LANGUAGE_CODE_MAPPING: Record<string, string> = {
  'ar-SA': 'ar',
  'de-DE': 'de',
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'pt-BR': 'pt', // 注意：pt-PT被映射到pt-BR，但反向映射只需要一个
  'ru-RU': 'ru',
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
};
