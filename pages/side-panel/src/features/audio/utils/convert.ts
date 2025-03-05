import type { SubtitleItem } from '@extension/shared';

/**
 * 将字幕条目转换为音频条目
 */
export const convertSubtitleItemsToAudioItems = async (subtitles: SubtitleItem[]): Promise<File> => {
  console.log(subtitles);

  const audioBlob = new Blob(
    [
      /* 这里放置音频数据 */
    ],
    { type: 'audio/mpeg' },
  );
  return new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
};
