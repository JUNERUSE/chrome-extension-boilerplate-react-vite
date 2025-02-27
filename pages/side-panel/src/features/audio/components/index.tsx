import { Card } from '@heroui/card';
import type { FC } from 'react';
import { memo } from 'react';

import { AudioProvider, useAudio } from './AudioContext';
import AudioFooter from './AudioFooter';
import AudioHeader from './AudioHeader';
import AudioProgress from './AudioProgress';

interface AudioPlayerProps {
  src: string;
  title?: string;
  captions?: string;
  onEnded?: () => void;
}

// 内部播放器组件，使用context中的状态
const AudioPlayerContent = memo(() => {
  const { isAudioReady } = useAudio();

  return (
    <Card
      className="bg-default-100 transition-opacity duration-150"
      style={{ opacity: isAudioReady ? 1 : 0.7 }}
      shadow="none"
      isDisabled={!isAudioReady}>
      <AudioHeader />
      <AudioProgress />
      <AudioFooter />
    </Card>
  );
});

AudioPlayerContent.displayName = 'AudioPlayerContent';

// 主播放器组件，提供context
const AudioPlayer: FC<AudioPlayerProps> = ({ src, title, captions, onEnded }) => {
  return (
    <AudioProvider src={src} title={title} captions={captions} onEnded={onEnded}>
      <AudioPlayerContent />
    </AudioProvider>
  );
};

export default memo(AudioPlayer);
