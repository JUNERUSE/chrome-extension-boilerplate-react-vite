import { Button } from '@heroui/button';
import { Form } from '@heroui/form';
import { Textarea } from '@heroui/input';
import { Select, SelectItem } from '@heroui/select';
import AudioPlayer from '@src/features/audio/components/AudioPlayer';
import { DEFAULT_VOICE_SETTINGS } from '@src/features/tts/constants';
import { audioQualityOptions, languageOptions, speedOptions } from '@src/features/tts/constants/options';
import type { TTSResponse, VoiceRSSParams } from '@src/features/tts/types';
import { fetchVoiceRSS } from '@src/features/tts/utils';
import type { FC } from 'react';
import type React from 'react';
import { useState } from 'react';

interface FormValues {
  [key: string]: string;
}

const Home: FC = () => {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioTitle, setAudioTitle] = useState<string>('');
  const [audioRelease, setAudioRelease] = useState<(() => void) | null>(null);

  // 语音设置默认值
  const [voiceSettings, setVoiceSettings] = useState<Partial<VoiceRSSParams>>({
    hl: DEFAULT_VOICE_SETTINGS.hl,
    r: DEFAULT_VOICE_SETTINGS.r,
    f: DEFAULT_VOICE_SETTINGS.f,
  });

  // 处理语音设置变更
  const handleSettingChange = (key: keyof VoiceRSSParams, value: string) => {
    setVoiceSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 清理之前的音频资源
    if (audioRelease) {
      audioRelease();
      setAudioRelease(null);
    }

    const formData = new FormData(e.currentTarget);
    const formValues: FormValues = {};

    formData.forEach((value, key) => {
      formValues[key] = value.toString();
    });

    // 设置状态并准备新请求
    setLoading(true);
    setAudioUrl('');

    console.log('开始TTS请求，文本:', formValues.text);
    console.log('语音设置:', voiceSettings);

    // 发起文本转语音请求
    try {
      const res = await fetchVoiceRSS(formValues.text, {
        voiceSettings: {
          ...voiceSettings,
        },
        onRequest: () => {
          console.log('请求成功，获取到作业数据:');
        },
        onResponse: (data: TTSResponse) => {
          console.log('响应成功，获取到TTS数据:', data);
        },
      });

      console.log('TTS结果:', res);

      if (!res) {
        return;
      }

      console.log('获取到音频URL:', res.url);
      setAudioUrl(res.url);
      setAudioTitle(`TTS 音频 - ${formValues.text.substring(0, 20)}${formValues.text.length > 20 ? '...' : ''}`);

      // 保存释放资源的函数
      if (res.releaseUrl) {
        setAudioRelease(() => res.releaseUrl);
      }
    } catch (error) {
      console.error('处理请求时出错:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    // 释放音频资源
    if (audioRelease) {
      audioRelease();
      setAudioRelease(null);
    }

    setAudioUrl('');
    setAudioTitle('');
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center p-4">
      <div className="w-full">
        <AudioPlayer
          src={audioUrl}
          title={audioTitle}
          onEnded={() => {
            console.log('音频播放完成');
            // 可以在这里添加播放完成后的逻辑
          }}
        />
      </div>

      <Form
        className="w-full flex flex-col items-center gap-3 justify-center"
        onSubmit={onSubmit}
        onReset={handleReset}>
        <Textarea
          label="输入文字"
          isRequired
          errorMessage="必须输入您的文字"
          name="text"
          placeholder="输入您要转换为语音的文字"
          minRows={5}
          maxRows={10}
          defaultValue="hello world"
          className="w-full"
          classNames={{
            inputWrapper: '!transition-transform',
          }}
        />

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select
            label="语言"
            defaultSelectedKeys={[voiceSettings.hl || DEFAULT_VOICE_SETTINGS.hl]}
            onChange={key => handleSettingChange('hl', key.toString())}>
            {languageOptions.map(option => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="语速"
            defaultSelectedKeys={[voiceSettings.r || DEFAULT_VOICE_SETTINGS.r]}
            onChange={key => handleSettingChange('r', key.toString())}>
            {speedOptions.map(option => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="音频质量"
            defaultSelectedKeys={[voiceSettings.f || DEFAULT_VOICE_SETTINGS.f]}
            onChange={key => handleSettingChange('f', key.toString())}>
            {audioQualityOptions.map(option => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex gap-2 items-center w-full justify-center">
          <Button type="reset" variant="flat" isDisabled={loading} fullWidth className="!transition-transform">
            重置
          </Button>
          <Button type="submit" color="primary" isLoading={loading} fullWidth>
            {loading ? '生成中...' : '生成语音'}
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default Home;
