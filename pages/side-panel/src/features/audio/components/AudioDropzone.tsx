import { cn } from '@extension/ui';
import { Button } from '@heroui/button';
import { IconCloudUpload } from '@tabler/icons-react';
import { type AnimationControls, motion } from 'framer-motion';
import { type FC, useState } from 'react';

import { ConnectionStatus } from '../hooks';
import AudioFromSubitles from './AudioFromSubitles';

interface AudioDropzoneProps {
  isDragging: boolean;
  controls: AnimationControls;
  connectionStatus: ConnectionStatus;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  onAudioFile: (file: File) => void;
  onFileSelect: () => void;
  disabled?: boolean;
}

const AudioDropzone: FC<AudioDropzoneProps> = ({
  isDragging,
  controls,
  connectionStatus,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
  onFileSelect,
  onAudioFile,
  disabled = false,
}) => {
  const [isInternalDisabled, setIsInternalDisabled] = useState(disabled);

  const isDisabled = disabled || isInternalDisabled;

  return (
    <div className="relative h-[320px]">
      <motion.div
        animate={controls}
        className={cn(
          'absolute inset-0 rounded-xl transition-all duration-200 border-2 border-dashed',
          isDragging ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700',
          isDisabled && 'opacity-60 cursor-not-allowed',
        )}
        onDragEnter={isDisabled ? undefined : handleDragEnter}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={isDisabled ? undefined : handleDragLeave}
        onDrop={isDisabled ? undefined : handleDrop}>
        <label
          htmlFor="audio-upload"
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="选择音频文件"
            disabled={isDisabled}
          />
          <div className="flex flex-col items-center gap-4">
            <Button
              isIconOnly
              color="primary"
              size="lg"
              variant="shadow"
              radius="full"
              onPress={onFileSelect}
              isDisabled={isDisabled}>
              <IconCloudUpload className="w-6 h-6" stroke={1.5} />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">点击选择或浏览文件</p>

              {/* 从字幕生成音频 */}
              <AudioFromSubitles
                disabled={isDisabled}
                setIsDisabled={setIsInternalDisabled}
                onAudioFile={onAudioFile}
              />

              {connectionStatus === ConnectionStatus.DISCONNECTED && (
                <p className="mt-2 text-xs text-red-500">请先打开 YouTube 视频页面</p>
              )}
            </div>
          </div>
        </label>
      </motion.div>
    </div>
  );
};

export default AudioDropzone;
