import { CardBody } from '@heroui/card';
import { Slider } from '@heroui/slider';
import { memo } from 'react';

import { calculateProgressPercentage } from '../utils';
import { useAudio } from './AudioContext';

const AudioProgress = () => {
  const { currentTime, duration, isAudioReady, handleProgress } = useAudio();

  // 计算进度百分比
  const progressPercentage = calculateProgressPercentage(currentTime, duration);

  return (
    <CardBody>
      <Slider
        aria-label="进度条"
        size="sm"
        isDisabled={!isAudioReady}
        onChange={handleProgress}
        value={progressPercentage}
        classNames={{
          track: 'transition-all duration-100',
          thumb: 'transition-transform duration-100',
        }}
      />
    </CardBody>
  );
};

export default memo(AudioProgress);
