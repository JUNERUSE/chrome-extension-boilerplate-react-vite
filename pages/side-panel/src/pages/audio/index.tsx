import { Card, CardBody, CardHeader } from '@heroui/card';
import { useCallback } from 'react';

import AudioDropzone from '../../features/audio/components/AudioDropzone';
import AudioFileInfo from '../../features/audio/components/AudioFileInfo';
import ConnectionStatusIndicator from '../../features/audio/components/ConnectionStatus';
import { useAudioFile, useConnectionStatus, useDragAndDrop } from '../../features/audio/hooks';

const Audio = () => {
  // 使用连接状态钩子
  const { connectionStatus, activeTabId, checkConnectionStatus, handleRefreshConnection } = useConnectionStatus();

  // 使用音频文件钩子
  const {
    audioFile,
    audioUrl,
    isReplacing,
    isReplaced,
    isVideoLoading,
    handleAudioFile,
    handleReplace,
    handleRestore,
    handleDelete,
  } = useAudioFile(connectionStatus, activeTabId, checkConnectionStatus);

  // 使用拖放钩子
  const { isDragging, controls, handleDragEnter, handleDragLeave, handleDrop } = useDragAndDrop(handleAudioFile);

  // 处理文件选择按钮点击
  const handleFileSelectClick = useCallback(() => {
    document.getElementById('audio-upload')?.click();
  }, []);

  // 判断是否禁用操作（非YouTube视频页面时禁用）
  const isDisabled = connectionStatus !== 'connected';

  return (
    <div className="p-4 space-y-4">
      <Card shadow="none" className="border border-default-100">
        <CardHeader className="flex-col items-start">
          <div className="flex justify-between w-full items-center">
            <h2 className="text-lg font-medium">音频上传</h2>
            <ConnectionStatusIndicator connectionStatus={connectionStatus} onRefresh={handleRefreshConnection} />
          </div>
          <p className="text-sm text-gray-500 mt-1">支持格式：MP3, WAV, OGG</p>
          {isDisabled && <p className="text-sm text-red-500 mt-1">请打开 YouTube 视频页面以启用音频替换功能</p>}
        </CardHeader>
        <CardBody className="space-y-4">
          {!audioUrl ? (
            <AudioDropzone
              isDragging={isDragging}
              controls={controls}
              connectionStatus={connectionStatus}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              onFileSelect={handleFileSelectClick}
              disabled={isDisabled}
            />
          ) : (
            <AudioFileInfo
              audioFile={audioFile}
              audioUrl={audioUrl}
              isReplacing={isReplacing}
              isReplaced={isReplaced}
              isVideoLoading={isVideoLoading}
              connectionStatus={connectionStatus}
              onDelete={handleDelete}
              onReplace={handleReplace}
              onRestore={handleRestore}
              disabled={isDisabled}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default Audio;
