import { cn } from '@extension/ui';
import { Button } from '@heroui/button';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
  IconRepeat,
  IconRepeatOff,
  IconVolume,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { memo } from 'react';

import { useAudio } from './AudioContext';

type AudioControlButtonProps = {
  disabled?: boolean;
  onPress: () => void;
  label: string;
  title?: string;
  icon: ReactNode;
  size?: 'normal' | 'large';
  variant?: 'solid' | 'flat' | 'light' | 'bordered';
  color?: 'default' | 'primary';
  className?: string;
};

const AudioControlButton = ({
  disabled = false,
  onPress,
  label,
  title,
  icon,
  size = 'normal',
  variant = 'flat',
  color = 'default',
  className = '',
}: AudioControlButtonProps) => {
  const sizeClasses = size === 'large' ? 'h-12 w-12' : 'h-9 w-9';
  const hoverEffect =
    variant === 'light' ? 'hover:bg-gray-100' : variant === 'bordered' ? 'hover:bg-gray-50' : 'hover:opacity-80';

  return (
    <Button
      isIconOnly
      isDisabled={disabled}
      onPress={onPress}
      color={color}
      variant={variant}
      aria-label={label}
      title={title || label}
      className={cn(sizeClasses, hoverEffect, className)}>
      {icon}
    </Button>
  );
};

const AudioControls = () => {
  const {
    isPlaying,
    isAudioReady,
    hasError,
    isLooping,
    duration,
    currentTime,
    audioStateRef,
    togglePlay,
    handleRewind,
    handleFastForward,
    toggleLoop,
    toggleVolumeControl,
    restartPlay,
  } = useAudio();

  return (
    <div className="flex justify-center items-center gap-3 mb-2">
      <AudioControlButton
        disabled={!isAudioReady}
        onPress={toggleLoop}
        variant={isLooping ? 'solid' : 'light'}
        label={isLooping ? '关闭循环' : '开启循环'}
        title={isLooping ? '关闭循环播放' : '开启循环播放'}
        icon={
          isLooping ? <IconRepeat className="h-5 w-5" stroke={2} /> : <IconRepeatOff className="h-5 w-5" stroke={2} />
        }
      />

      <AudioControlButton
        disabled={!isAudioReady}
        onPress={handleRewind}
        label="快退"
        title={`快退 ${audioStateRef.current.skipSeconds} 秒`}
        icon={<IconPlayerTrackPrev className="h-5 w-5" stroke={2} />}
      />

      <AudioControlButton
        disabled={!isAudioReady && !hasError}
        onPress={hasError ? () => document.querySelector('audio')?.load() : togglePlay}
        color="primary"
        variant={hasError ? 'bordered' : 'solid'}
        size="large"
        label={hasError ? '重试' : isPlaying ? '暂停' : '播放'}
        icon={
          hasError ? (
            <IconRepeat className="h-6 w-6" stroke={2} />
          ) : isPlaying ? (
            <IconPlayerPause className="h-6 w-6" stroke={2} />
          ) : (
            <IconPlayerPlay className="h-6 w-6" stroke={2} />
          )
        }
        className="shadow-md"
      />

      <AudioControlButton
        disabled={!isAudioReady}
        onPress={handleFastForward}
        label="快进"
        title={`快进 ${audioStateRef.current.skipSeconds} 秒`}
        icon={<IconPlayerTrackNext className="h-5 w-5" stroke={2} />}
      />

      <AudioControlButton
        disabled={!isAudioReady}
        onPress={toggleVolumeControl}
        variant="light"
        label="音量控制"
        icon={<IconVolume className="h-5 w-5" stroke={2} />}
      />

      {currentTime >= duration && duration > 0 && !isLooping && (
        <AudioControlButton
          onPress={restartPlay}
          variant="bordered"
          label="重新播放"
          icon={<IconPlayerPlay className="h-5 w-5" stroke={2} />}
          className="animate-fade-in"
        />
      )}
    </div>
  );
};

export default memo(AudioControls);
