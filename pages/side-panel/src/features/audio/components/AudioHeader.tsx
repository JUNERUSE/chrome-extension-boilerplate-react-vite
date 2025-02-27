import { CardHeader } from '@heroui/card';
import { IconMusic, IconRepeat } from '@tabler/icons-react';
import { memo } from 'react';

import { formatTime } from '../utils';
import { useAudio } from './AudioContext';

interface AudioHeaderProps {
  title?: string;
}

const AudioHeader = ({ title }: AudioHeaderProps) => {
  const { currentTime, duration, isLooping, hasError } = useAudio();

  return (
    <CardHeader>
      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
        <IconMusic className="h-6 w-6 text-blue-500 dark:text-blue-300" stroke={1.5} />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-0.5 truncate">
          {title || 'TTS 音频'}
        </h3>
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 min-w-[70px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
          {isLooping && (
            <span className="text-xs text-blue-500 dark:text-blue-300 flex items-center">
              <IconRepeat className="h-3 w-3 mr-1" /> 循环播放
            </span>
          )}
          {hasError && <span className="text-xs text-red-500 flex items-center">加载错误</span>}
        </div>
      </div>
    </CardHeader>
  );
};

export default memo(AudioHeader);
