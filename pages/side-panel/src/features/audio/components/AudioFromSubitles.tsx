import { Link } from '@heroui/link';
import { Spinner } from '@heroui/spinner';
import { extractVideoId, isYoutubeVideoPage } from '@src/features/common';
import { subtitleDB } from '@src/features/subtitles/utils/db';
import { getYouTubeSubtitles } from '@src/features/subtitles/utils/youtube-subtitles';
import { type FC, useState } from 'react';

import { convertSubtitleItemsToAudioItems } from '../utils/convert';

interface AudioFromSubitlesProps {
  disabled?: boolean;
  setIsDisabled: (disabled: boolean) => void;
  onAudioFile: (file: File) => void;
}

const AudioFromSubitles: FC<AudioFromSubitlesProps> = ({ disabled = false, setIsDisabled, onAudioFile }) => {
  const [isLoading, setIsLoading] = useState(false);

  // 生成音频
  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setIsDisabled(true);

      // 1. 获取当前 tab 信息
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !isYoutubeVideoPage(tab.url)) {
        console.log('不是 YouTube 视频页面');
        return;
      }

      // 2. 获取视频ID
      const videoId = extractVideoId(tab.url);
      if (!videoId) {
        console.log('不是 YouTube 视频页面');
        return;
      }

      // 3. 获取字幕
      // 3.1 首先从缓存字幕
      let subtitles = await subtitleDB.getSubtitles(videoId);

      // 3.1.1 如果缓存字幕不存在或者语言不是中文，则从 YouTube 获取
      if (!subtitles || !subtitles.language.includes('zh')) {
        subtitles = await getYouTubeSubtitles(videoId);
        if (!subtitles) {
          console.log('获取字幕失败');
          return;
        }

        // 3.1.2 缓存字幕
        await subtitleDB.saveSubtitles(subtitles);
      }

      // 4. 通过字幕生成音频
      const audioFile = await convertSubtitleItemsToAudioItems(subtitles.items);

      // 5. 处理音频文件
      onAudioFile(audioFile);
    } catch (error) {
      console.error('生成音频失败:', error);
    } finally {
      setIsLoading(false);
      setIsDisabled(false);
    }
  };

  return (
    <Link
      className="text-xs mt-1 space-x-2"
      size="sm"
      href="javascript:void(0)"
      underline={isLoading ? 'none' : 'always'}
      isDisabled={isLoading || disabled}
      onPress={handleGenerate}>
      {isLoading && <Spinner size="sm" className="scale-75" />}
      <span>{isLoading ? '生成中...' : '实时从字幕生成音频（中文）'}</span>
    </Link>
  );
};

export default AudioFromSubitles;
