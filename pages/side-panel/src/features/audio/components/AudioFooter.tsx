import { CardFooter } from '@heroui/card';
import { memo } from 'react';

import { useAudio } from './AudioContext';
import AudioControls from './AudioControls';
import VolumeControl from './VolumeControl';

const AudioFooter = () => {
  const { audioStateRef } = useAudio();

  return (
    <CardFooter className="flex-col">
      <AudioControls />
      <VolumeControl />

      <div className="w-full flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
        <span>快退 {audioStateRef.current.skipSeconds} 秒</span>
        <span>快进 {audioStateRef.current.skipSeconds} 秒</span>
      </div>
    </CardFooter>
  );
};

export default memo(AudioFooter);
