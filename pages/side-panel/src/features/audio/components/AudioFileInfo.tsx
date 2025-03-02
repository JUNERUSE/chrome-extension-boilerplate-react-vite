import { Button } from '@heroui/button';
import { IconFileMusic, IconLoader2, IconTrash } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

import { ConnectionStatus } from '../hooks';
import AudioPlayer from './index';

interface AudioFileInfoProps {
  audioFile: File | null;
  audioUrl: string;
  isReplacing: boolean;
  isReplaced: boolean;
  isVideoLoading: boolean;
  connectionStatus: ConnectionStatus;
  onDelete: () => void;
  onReplace: () => void;
  onRestore: () => void;
  disabled?: boolean;
}

const AudioFileInfo: FC<AudioFileInfoProps> = ({
  audioFile,
  audioUrl,
  isReplacing,
  isReplaced,
  isVideoLoading,
  connectionStatus,
  onDelete,
  onReplace,
  onRestore,
  disabled = false,
}) => {
  // 渲染替换按钮状态
  const renderReplaceButton = () => {
    // 如果视频正在加载，显示加载状态
    if (isVideoLoading && isReplaced) {
      return (
        <Button
          color="warning"
          isLoading={isReplacing}
          onPress={onRestore}
          className="w-full"
          isDisabled={disabled || connectionStatus !== ConnectionStatus.CONNECTED}>
          <div className="flex items-center gap-1">
            <IconLoader2 className="w-4 h-4 animate-spin" />
            <span>视频加载中...</span>
          </div>
        </Button>
      );
    }

    // 正常状态下的按钮
    return (
      <Button
        color={isReplaced ? 'default' : 'primary'}
        isLoading={isReplacing}
        onPress={isReplaced ? onRestore : onReplace}
        className="w-full"
        isDisabled={disabled || connectionStatus !== ConnectionStatus.CONNECTED}>
        {isReplaced ? '恢复原音频' : '替换 YouTube 视频音频'}
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
          <IconFileMusic className="w-6 h-6 text-blue-500 dark:text-blue-400" stroke={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{audioFile?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {audioFile?.size ? `${(audioFile.size / 1024 / 1024).toFixed(2)} MB` : '未知大小'}
          </p>
        </div>
      </div>
      <AudioPlayer src={audioUrl} title={audioFile?.name} />

      <div className="flex items-center justify-between gap-2">
        <Button isIconOnly variant="light" color="danger" onPress={onDelete} className="shrink-0" isDisabled={disabled}>
          <IconTrash className="w-4 h-4" />
        </Button>
        {renderReplaceButton()}
      </div>
      {isVideoLoading && isReplaced && (
        <div className="text-xs text-amber-500 text-center">
          <p>YouTube 视频正在缓冲，音频将在视频加载完成后继续播放</p>
        </div>
      )}
      {connectionStatus === ConnectionStatus.DISCONNECTED && (
        <div className="text-xs text-red-500 text-center mt-2">
          <p>请先打开 YouTube 视频页面并刷新后再尝试</p>
          <p className="mt-1">如果问题仍然存在，请点击上方的刷新按钮尝试重新连接</p>
        </div>
      )}
    </motion.div>
  );
};

export default AudioFileInfo;
