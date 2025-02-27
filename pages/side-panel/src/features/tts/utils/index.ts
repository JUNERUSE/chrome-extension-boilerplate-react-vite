import { DEFAULT_VOICE_SETTINGS, TTS_API_HEADERS, TTS_API_KEY, TTS_API_URL } from '../constants';
import type { JobResponse, TTSResponse, VoiceRSSParams } from '../types';

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
    onRequest?: (jobData: JobResponse) => void;
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

    // 模拟原有 API 行为，创建一个 jobData 对象并调用 onRequest 回调
    const jobData: JobResponse = {
      id,
      status: 'processing',
      eta: 1, // Voice RSS API 处理很快，预计只需 1 秒
      text,
    };

    // 调用请求开始回调
    options?.onRequest?.(jobData);

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

    // 检查响应类型和内容
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg';
    console.log('音频响应内容类型:', contentType);

    // 确保blob有正确的类型
    const typedAudioBlob = new Blob([await audioBlob.arrayBuffer()], {
      type: contentType.includes('audio') ? contentType : 'audio/mpeg',
    });

    // 检查音频大小
    if (typedAudioBlob.size < 100) {
      console.warn('警告: 音频数据异常小 (' + typedAudioBlob.size + ' bytes)');
    }

    // 在Chrome扩展中创建blob URL
    const audioUrl = URL.createObjectURL(typedAudioBlob);

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
    console.log('音频Blob大小:', typedAudioBlob.size, 'bytes');

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
