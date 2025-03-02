import { Card, CardBody, CardHeader } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { useCallback, useEffect, useState } from 'react';

import AudioDropzone from '../../features/audio/components/AudioDropzone';
import AudioFileInfo from '../../features/audio/components/AudioFileInfo';
import ConnectionStatusIndicator from '../../features/audio/components/ConnectionStatus';
import { ConnectionStatus, useAudioFile, useConnectionStatus, useDragAndDrop } from '../../features/audio/hooks';

const Audio = () => {
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(true);

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
    isInitialized,
  } = useAudioFile(connectionStatus, activeTabId, checkConnectionStatus);

  // 使用拖放钩子
  const { isDragging, controls, handleDragEnter, handleDragLeave, handleDrop } = useDragAndDrop(handleAudioFile);

  // 处理文件选择按钮点击
  const handleFileSelectClick = useCallback(() => {
    document.getElementById('audio-upload')?.click();
  }, []);

  // 判断是否禁用操作（非YouTube视频页面时禁用）
  const isDisabled = connectionStatus !== ConnectionStatus.CONNECTED;

  // 根据连接状态和初始化状态控制加载状态
  useEffect(() => {
    // 如果不是YouTube页面（连接状态为DISCONNECTED），不显示加载状态
    if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      setIsLoading(false);
      return;
    }

    // 如果是YouTube页面，等待初始化完成
    if (isInitialized) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [connectionStatus, isInitialized]);

  // 当连接状态或初始化状态变化时，重置加载状态
  useEffect(() => {
    // 当连接状态变化时，如果是切换到YouTube页面，显示加载状态
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      setIsLoading(true);
    }
  }, [connectionStatus]);

  // 渲染内容
  const renderContent = () => {
    // 如果正在加载且是YouTube页面，显示加载状态
    if (isLoading && connectionStatus === ConnectionStatus.CONNECTED) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-sm text-gray-500">正在加载音频状态...</p>
        </div>
      );
    }

    // 如果有音频URL，显示音频信息
    if (audioUrl) {
      return (
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
      );
    }

    // 默认显示音频上传区域
    return (
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
    );
  };

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
        <CardBody className="space-y-4">{renderContent()}</CardBody>
      </Card>
    </div>
  );
};

export default Audio;
