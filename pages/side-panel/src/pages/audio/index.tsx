import { cn } from '@extension/ui';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Input } from '@heroui/input';
import { IconCloudUpload, IconFileMusic, IconTrash, IconUpload } from '@tabler/icons-react';
import { motion, useAnimation } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import AudioPlayer from '../../features/audio/components';

const Audio = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();

  // 处理全局拖拽事件
  useEffect(() => {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging && e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
        controls.start({
          scale: 1,
          transition: { duration: 0.1 },
        });
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
        controls.start({
          scale: 1,
          transition: { duration: 0.1 },
        });
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, [isDragging, controls]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      controls.start({
        scale: 1,
        transition: { duration: 0.2 },
      });
    },
    [controls],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.relatedTarget as Node;
      // 检查是否真的离开了拖放区域
      const dropzone = e.currentTarget as HTMLElement;
      if (!dropzone.contains(target)) {
        setIsDragging(false);
        controls.start({
          scale: 1,
          transition: { duration: 0.2 },
        });
      }
    },
    [controls],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      controls.start({
        scale: 1,
        transition: { duration: 0.2 },
      });

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
      }
    },
    [controls],
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  }, []);

  const handleReplace = useCallback(async () => {
    if (!audioFile) return;

    setIsReplacing(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      await chrome.tabs.sendMessage(tab.id, {
        type: 'REPLACE_YOUTUBE_AUDIO',
        audioUrl: audioUrl,
      });
    } catch (error) {
      console.error('替换音频失败:', error);
    } finally {
      setIsReplacing(false);
    }
  }, [audioFile, audioUrl]);

  const handleDelete = useCallback(() => {
    setAudioFile(null);
    setAudioUrl('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  return (
    <div className="p-4 space-y-4">
      <Card shadow="none" className="border border-default-100">
        <CardHeader>
          <h2 className="text-lg font-medium">音频上传</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {!audioUrl ? (
            <div className="relative h-48">
              <motion.div
                animate={controls}
                className={cn(
                  'absolute inset-0 rounded-xl transition-all duration-200',
                  isDragging && 'ring-2 ring-blue-200 dark:ring-blue-500/30 bg-blue-50/50 dark:bg-blue-900/20 scale-1',
                )}
                onDragEnter={handleDragEnter}
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    label="选择音频文件"
                    placeholder="支持 MP3, WAV 等格式"
                    startContent={<IconUpload className="text-default-400" />}
                    className={`relative z-10 max-w-[80%] mx-auto ${isDragging ? 'opacity-0' : ''}`}
                  />
                </div>
                <motion.div
                  className="absolute inset-0 flex items-center justify-center rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDragging ? 1 : 0 }}
                  transition={{ duration: 0.2 }}>
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* 高斯模糊背景 */}
                    <div className="absolute rounded-xl" />
                    {/* 虚线边框 */}
                    <div className="absolute inset-4 border-2 border-dashed border-blue-200 dark:border-blue-500/30 rounded-lg" />
                    {/* 内容 */}
                    <div className="relative flex flex-col items-center gap-4 p-4 text-center">
                      <IconCloudUpload className="w-16 h-16 text-blue-400/80 dark:text-blue-300/80" stroke={1.2} />
                      <div>
                        <p className="text-base font-medium text-blue-500/90 dark:text-blue-300/90">
                          拖放音频文件到这里
                        </p>
                        <p className="text-sm text-blue-400/70 dark:text-blue-400/60 mt-1">支持 MP3, WAV 等格式</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
                <div className="flex items-center gap-3 min-w-0">
                  <IconFileMusic className="w-5 h-5 shrink-0 text-blue-400/80 dark:text-blue-300/80" stroke={1.2} />
                  <span className="text-sm text-blue-600/90 dark:text-blue-300/90 truncate">{audioFile?.name}</span>
                </div>
              </div>
              <AudioPlayer src={audioUrl} title={audioFile?.name} />
              <div className="flex items-center justify-between gap-2">
                <Button isIconOnly variant="light" color="danger" onPress={handleDelete} className="shrink-0">
                  <IconTrash className="w-4 h-4" />
                </Button>
                <Button
                  color="primary"
                  isLoading={isReplacing}
                  onPress={handleReplace}
                  variant="flat"
                  className="w-full">
                  替换 YouTube 视频音频
                </Button>
              </div>
            </motion.div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default Audio;
