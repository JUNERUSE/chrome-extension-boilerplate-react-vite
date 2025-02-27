import { DEFAULT_VOICE_SETTINGS, TTS_API_HEADERS, TTS_API_KEY, TTS_API_URL } from '../constants';
import type { TTSResponse, VoiceRSSParams } from '../types';

/**
 * 使用 Voice RSS API 直接获取文本转语音的音频 URL
 * @param text 要转换的文本
 * @param options 转换选项和回调函数
 * @returns 包含音频 URL 的对象
 */
export const fetchVoiceRSS = async (
  text: string,
  options?: {
    voiceSettings?: Partial<VoiceRSSParams>;
    onRequest?: () => void;
    onResponse?: (data: TTSResponse) => void;
  },
) => {
  try {
    // 创建请求参数
    const encodedParams = new URLSearchParams();
    encodedParams.set('src', text);
    encodedParams.set('hl', options?.voiceSettings?.hl || DEFAULT_VOICE_SETTINGS.hl);
    encodedParams.set('r', options?.voiceSettings?.r || DEFAULT_VOICE_SETTINGS.r);
    encodedParams.set('c', options?.voiceSettings?.c || DEFAULT_VOICE_SETTINGS.c);
    encodedParams.set('f', options?.voiceSettings?.f || DEFAULT_VOICE_SETTINGS.f);

    // 生成唯一 ID 用于跟踪请求
    const id = `tts-${Date.now()}`;

    // 调用请求开始回调
    options?.onRequest?.();

    // 发起实际请求
    const apiUrl = `${TTS_API_URL}?key=${TTS_API_KEY}`;
    console.log('发送 Voice RSS TTS 请求:', { url: apiUrl, text: text.substring(0, 50) + '...' });

    const startTime = Date.now();

    // 发送请求并获取音频数据
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: TTS_API_HEADERS,
      body: encodedParams,
    });

    if (!response.ok) {
      console.error('API响应错误状态:', response.status, response.statusText);
      // 尝试读取错误信息
      const errorText = await response.text().catch(() => '无法读取错误详情');
      throw new Error(`API 响应错误: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // 获取音频 blob
    const audioBlob = await response.blob();

    // 创建blob URL
    const audioUrl = URL.createObjectURL(audioBlob);

    // 添加释放资源的函数
    const releaseUrl = () => {
      try {
        URL.revokeObjectURL(audioUrl);
        console.log('音频资源已释放:', audioUrl);
      } catch (e) {
        console.error('释放音频资源失败:', e);
      }
    };

    // 记录音频信息用于调试
    console.log('创建的音频URL:', audioUrl);

    // 计算处理时间
    const jobTime = (Date.now() - startTime) / 1000;

    // 创建响应对象
    const ttsResponse: TTSResponse = {
      id,
      status: 'success',
      url: audioUrl,
      job_time: jobTime,
      releaseUrl, // 添加释放资源的函数
    };

    // 调用响应回调
    options?.onResponse?.(ttsResponse);

    return ttsResponse;
  } catch (error) {
    console.error('Voice RSS TTS 处理出错:', error);
    return null;
  }
};
