import { cn } from '@extension/ui';
import { Button } from '@heroui/button';
import { IconCloudUpload } from '@tabler/icons-react';
import { type AnimationControls, motion } from 'framer-motion';
import type { FC } from 'react';

import { ConnectionStatus } from '../hooks';

interface AudioDropzoneProps {
  isDragging: boolean;
  controls: AnimationControls;
  connectionStatus: ConnectionStatus;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
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
  disabled = false,
}) => {
  return (
    <div className="relative h-[320px]">
      <motion.div
        animate={controls}
        className={cn(
          'absolute inset-0 rounded-xl transition-all duration-200 border-2 border-dashed',
          isDragging ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragOver={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}>
        <label
          htmlFor="audio-upload"
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          )}>
          <input
            id="audio-upload"
            type="file"
            accept="audio/*"
            className="hidden"
            aria-label="选择音频文件"
            disabled={disabled}
          />
          <div className="flex flex-col items-center gap-4">
            <Button
              isIconOnly
              color="primary"
              size="lg"
              variant="shadow"
              radius="full"
              onPress={onFileSelect}
              isDisabled={disabled}>
              <IconCloudUpload className="w-6 h-6" stroke={1.5} />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">点击选择或浏览文件</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">或将文件拖放到此处</p>
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
