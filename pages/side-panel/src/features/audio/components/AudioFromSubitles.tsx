import type { VoiceLocale } from '@extension/shared';
import {
  convertSubtitleItemsToAudio,
  EdgeSpeechTTS,
  extractVideoId,
  getYouTubeLanguageCode,
  getYouTubeSubtitles,
  isYoutubeVideoPage,
  mergeSubtitlesAndFixOverlapping,
  subtitleDB,
} from '@extension/shared';
import { Button } from '@heroui/button';
import { Form } from '@heroui/form';
import { Select, SelectItem } from '@heroui/select';
import { type FC, useMemo, useState } from 'react';

interface AudioFromSubitlesProps {
  disabled?: boolean;
  setIsDisabled: (disabled: boolean) => void;
  onAudioFile: (file: File) => void;
}

interface VoiceSettings {
  locale: VoiceLocale;
  voiceName: string;
}

const defaultVoiceSettings: VoiceSettings = {
  locale: 'zh-CN',
  voiceName: 'zh-CN-XiaoxiaoNeural',
};

const AudioFromSubitles: FC<AudioFromSubitlesProps> = ({ disabled = false, setIsDisabled, onAudioFile }) => {
  const [isLoading, setLoading] = useState(false);

  // 语音设置默认值
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);

  const voiceNameOptions = useMemo(() => EdgeSpeechTTS?.voiceList[voiceSettings.locale], [voiceSettings.locale]);

  // 处理语音设置变更
  const handleSettingChange = (key: 'locale' | 'voiceName', value: string) => {
    setVoiceSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // 生成音频
  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setLoading(true);
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

      // 3.2 获取标准语言代码
      const yotubeLanguageCode = getYouTubeLanguageCode(voiceSettings.locale);

      // 3.2.1 如果缓存字幕不是本次语言，则从 YouTube 获取
      if (!subtitles || subtitles.language !== yotubeLanguageCode) {
        subtitles = await getYouTubeSubtitles(videoId, yotubeLanguageCode);
        if (!subtitles) {
          console.log('获取字幕失败');
          return;
        }

        // 3.2.2 缓存字幕
        await subtitleDB.saveSubtitles(subtitles);
      }

      // 4. 合并字幕
      const mergedSubtitles = mergeSubtitlesAndFixOverlapping(subtitles.items);

      // 4. 通过字幕生成音频
      const audioFile = await convertSubtitleItemsToAudio(mergedSubtitles, {
        ttsOptions: {
          voice: voiceSettings.voiceName,
        },
        serviceOptions: {
          locale: voiceSettings.locale,
        },
      });

      // 5. 处理音频文件
      onAudioFile(audioFile);
    } catch (error) {
      console.error('生成音频失败:', error);
    } finally {
      setLoading(false);
      setIsDisabled(false);
    }
  };

  return (
    <Form className="w-full flex flex-col items-center gap-3 justify-center" onSubmit={handleGenerate}>
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
        {EdgeSpeechTTS?.localeOptions && EdgeSpeechTTS.localeOptions?.length > 0 && (
          <Select
            name="locale"
            isDisabled={disabled || isLoading}
            label="语言"
            defaultSelectedKeys={[voiceSettings.locale]}
            onChange={e => handleSettingChange('locale', e.target.value)}>
            {EdgeSpeechTTS.localeOptions.map(option => (
              <SelectItem key={option.value}>{option.label}</SelectItem>
            ))}
          </Select>
        )}

        <Select
          key={voiceSettings.locale}
          name="voiceName"
          label="名称"
          defaultSelectedKeys={[voiceNameOptions?.[0] || '']}
          onChange={e => handleSettingChange('voiceName', e.target.value)}>
          {voiceNameOptions?.map(option => <SelectItem key={option}>{EdgeSpeechTTS?.voiceName[option]}</SelectItem>)}
        </Select>
      </div>

      <div className="flex gap-2 items-center w-full justify-center">
        <Button
          isDisabled={disabled || isLoading}
          type="reset"
          variant="flat"
          fullWidth
          className="!transition-transform">
          重置
        </Button>
        <Button isDisabled={disabled || isLoading} isLoading={isLoading} type="submit" color="primary" fullWidth>
          {isLoading ? '生成中...' : '生成语音'}
        </Button>
      </div>
    </Form>
  );
};

export default AudioFromSubitles;
