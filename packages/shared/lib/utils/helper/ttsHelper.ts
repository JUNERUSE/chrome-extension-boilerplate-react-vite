import type { MicrosoftSpeechAPI } from '@lobehub/tts';
import { EdgeSpeechTTS } from '@lobehub/tts';
import type { SsmlOptions } from '@lobehub/tts/es/core/utils/genSSML.js';

interface SubtitleItem {
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * 辅助函数：将字符串写入DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export interface ConvertSubtitleItemsToAudioOptions {
  ttsOptions?: Pick<SsmlOptions, 'voice'>;
  serviceOptions?: MicrosoftSpeechAPI;
}

/**
 * 合成多个音频缓冲区，考虑时间间隔
 */
function mergeAudioBuffers(audioBuffers: AudioBuffer[], subtitles: SubtitleItem[], totalSamples: number): ArrayBuffer {
  if (audioBuffers.length === 0) return new ArrayBuffer(0);

  const sampleRate = audioBuffers[0].sampleRate;
  const numChannels = audioBuffers[0].numberOfChannels;

  // 创建合并后的音频数据数组
  const mergedChannelData: Float32Array[] = [];
  for (let channel = 0; channel < numChannels; channel++) {
    mergedChannelData.push(new Float32Array(totalSamples));
  }

  // 遍历每个字幕和对应的音频缓冲区，根据时间戳合并到目标缓冲区
  for (let i = 0; i < subtitles.length; i++) {
    const subtitle = subtitles[i];
    const audioBuffer = audioBuffers[i];

    // 计算起始样本位置（将毫秒转换为样本数）
    const startSample = Math.floor((subtitle.startTime * sampleRate) / 1000);

    // 复制每个通道的数据
    for (let channel = 0; channel < numChannels; channel++) {
      const targetChannelData = mergedChannelData[channel];
      const sourceChannelData = audioBuffer.getChannelData(channel);

      // 复制音频数据到目标位置
      for (let j = 0; j < audioBuffer.length; j++) {
        if (startSample + j < totalSamples) {
          targetChannelData[startSample + j] += sourceChannelData[j];
        }
      }
    }
  }

  // 标准化音频数据，防止溢出
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = mergedChannelData[channel];
    let maxAmplitude = 0;

    // 找出最大振幅
    for (let i = 0; i < totalSamples; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > maxAmplitude) {
        maxAmplitude = absValue;
      }
    }

    // 如果需要，进行标准化
    if (maxAmplitude > 1.0) {
      const scaleFactor = 1.0 / maxAmplitude;
      for (let i = 0; i < totalSamples; i++) {
        channelData[i] *= scaleFactor;
      }
    }
  }

  // 创建一个符合Web Audio API的AudioBuffer
  // 由于环境可能不支持AudioContext，我们直接构建WAV数据
  const length = totalSamples * numChannels * 2; // 16位每样本 = 2字节
  const buffer = new ArrayBuffer(44 + length); // WAV头部 = 44字节
  const view = new DataView(buffer);

  // 写入WAV文件头
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM格式
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // 字节率
  view.setUint16(32, numChannels * 2, true); // 块对齐
  view.setUint16(34, 16, true); // 位深度
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // 写入PCM数据
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, mergedChannelData[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

/**
 * 将字幕条目转换为音频条目
 */
export const convertSubtitleItemsToAudio = async (
  subtitles: SubtitleItem[],
  options?: ConvertSubtitleItemsToAudioOptions,
): Promise<File> => {
  const { ttsOptions, serviceOptions } = options || {};

  const { locale = 'zh-CN', ...restServiceOptions } = serviceOptions || {};
  const { voice = 'zh-CN-XiaoxiaoNeural', ...restTtsOptions } = ttsOptions || {};

  const tts = new EdgeSpeechTTS({ locale, ...restServiceOptions });

  const audioBuffers = await Promise.all(
    subtitles.map(async subtitle => {
      const response: AudioBuffer = await tts.createAudio({
        input: subtitle.text,
        options: { voice, ...restTtsOptions },
      });
      return response;
    }),
  );

  // 如果没有音频数据，返回空文件
  if (audioBuffers.length === 0) {
    return new File([], 'empty.wav', { type: 'audio/wav' });
  }

  // 计算最大的结束时间点，单位为毫秒
  const maxEndTime = Math.max(...subtitles.map(subtitle => subtitle.endTime));

  // 将毫秒转换为样本数
  const totalSamples = Math.ceil((maxEndTime * audioBuffers[0].sampleRate) / 1000);

  // 合并音频缓冲区
  const wavBuffer = mergeAudioBuffers(audioBuffers, subtitles, totalSamples);

  // 创建 Blob 和 File 对象
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return new File([blob], 'merged_audio.wav', { type: 'audio/wav' });
};
