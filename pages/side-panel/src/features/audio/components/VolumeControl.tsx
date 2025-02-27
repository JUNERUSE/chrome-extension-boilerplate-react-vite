import { Button } from '@heroui/button';
import { Slider } from '@heroui/slider';
import { IconVolume, IconVolumeOff } from '@tabler/icons-react';
import { memo } from 'react';

import { useAudio } from './AudioContext';

const VolumeControl = () => {
  const { volume, showVolumeControl, toggleMute, handleVolumeChange } = useAudio();

  return (
    <div
      className={`flex items-center gap-2 w-full mb-2 px-2 transition-opacity duration-200 overflow-hidden ${
        showVolumeControl ? 'opacity-100 max-h-10' : 'opacity-0 max-h-0'
      }`}>
      <Button isIconOnly size="sm" onPress={toggleMute} aria-label={volume > 0 ? '静音' : '取消静音'}>
        {volume > 0 ? <IconVolume className="h-4 w-4" /> : <IconVolumeOff className="h-4 w-4" />}
      </Button>
      <Slider
        size="sm"
        aria-label="音量控制"
        value={volume}
        onChange={handleVolumeChange}
        step={0.05}
        maxValue={1}
        minValue={0}
        className="flex-1"
        classNames={{
          track: 'transition-all duration-100',
          thumb: 'transition-transform duration-100',
        }}
      />
      <span className="text-xs">{Math.round(volume * 100)}%</span>
    </div>
  );
};

export default memo(VolumeControl);
