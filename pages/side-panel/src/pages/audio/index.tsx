import { cn } from '@extension/ui';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import {
  IconCloudUpload,
  IconFileMusic,
  IconLoader2,
  IconPlugConnected,
  IconPlugConnectedX,
  IconRefresh,
  IconTrash,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { motion, useAnimation } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import AudioPlayer from '../../features/audio/components';

interface DragState {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}

// 连接状态枚举
enum ConnectionStatus {
  UNKNOWN = 'unknown',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

// 添加音量控制组件
const VolumeControl = ({ activeTabId, isReplaced }: { activeTabId: number | null; isReplaced: boolean }) => {
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [lastUserSetVolume, setLastUserSetVolume] = useState<number | null>(null);
  const updateTimeoutRef = useRef<number | null>(null);
  const volumeCheckIntervalRef = useRef<number | null>(null);
  const userInteractionTimeRef = useRef<number>(0);

  // 获取当前音量状态
  const getVolumeStatus = useCallback(() => {
    if (activeTabId && isReplaced) {
      // 首先检查音频是否仍然被替换
      chrome.tabs.sendMessage(activeTabId, { type: 'CHECK_AUDIO_REPLACED' }, response => {
        if (chrome.runtime.lastError) {
          console.error('检查音频替换状态失败:', chrome.runtime.lastError);
          return;
        }

        // 如果音频不再被替换，不要继续获取音量
        if (!response || !response.replaced) {
          console.log('音频不再被替换，停止获取音量状态');
          return;
        }

        // 获取音量状态
        chrome.tabs.sendMessage(activeTabId, { type: 'GET_AUDIO_VOLUME' }, response => {
          if (chrome.runtime.lastError) {
            console.error('获取音量状态失败:', chrome.runtime.lastError);
            return;
          }

          if (response && typeof response.volume === 'number') {
            // 检查是否在用户交互后的短时间内
            const now = Date.now();
            const timeSinceUserInteraction = now - userInteractionTimeRef.current;

            // 如果用户最近交互过（5秒内），并且有用户设置的音量，不要覆盖
            if (timeSinceUserInteraction < 5000 && lastUserSetVolume !== null) {
              console.log('用户最近交互过，保持用户设置的音量:', lastUserSetVolume);
              return;
            }

            // 否则更新UI显示的音量
            const newVolume = Math.round(response.volume * 100);
            setVolume(newVolume);
            setIsMuted(response.muted);
          }
        });
      });
    }
    return undefined; // 确保所有路径都有返回值
  }, [activeTabId, isReplaced, lastUserSetVolume]);

  // 发送音量更新到内容脚本
  const sendVolumeUpdate = useCallback(
    (newVolume: number) => {
      // 发送消息到内容脚本更新音量
      if (activeTabId && isReplaced) {
        setIsUpdating(true);
        chrome.tabs.sendMessage(
          activeTabId,
          {
            type: 'UPDATE_AUDIO_VOLUME',
            volume: newVolume / 100,
          },
          () => {
            setIsUpdating(false);
            if (chrome.runtime.lastError) {
              console.error('发送音量更新消息失败:', chrome.runtime.lastError);
              // 如果是连接断开错误，可以尝试重新连接
              if (
                chrome.runtime.lastError.message?.includes('port closed') ||
                chrome.runtime.lastError.message?.includes('disconnected')
              ) {
                console.log('连接已断开，尝试重新获取音量状态');
                // 短暂延迟后重新获取状态
                setTimeout(getVolumeStatus, 500);
              }
            }
          },
        );
      }
      return undefined; // 确保所有路径都有返回值
    },
    [activeTabId, isReplaced, getVolumeStatus],
  );

  // 处理音量变化 - 添加防抖动
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
      // 记录用户设置的音量
      setLastUserSetVolume(newVolume);
      // 记录用户交互时间
      userInteractionTimeRef.current = Date.now();

      // 如果当前是静音状态且音量大于0，取消静音
      if (isMuted && newVolume > 0) {
        setIsMuted(false);
      }

      // 防抖动处理 - 避免频繁发送消息
      const now = Date.now();
      if (now - lastUpdateTime < 100) {
        // 如果距离上次更新不到100ms，延迟发送
        if (updateTimeoutRef.current) {
          window.clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = window.setTimeout(() => {
          sendVolumeUpdate(newVolume);
          updateTimeoutRef.current = null;
        }, 100);
        return;
      }

      // 直接发送更新
      sendVolumeUpdate(newVolume);
      setLastUpdateTime(now);
    },
    [isMuted, lastUpdateTime, sendVolumeUpdate],
  );

  // 处理静音切换
  const handleMuteToggle = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    // 记录用户交互时间
    userInteractionTimeRef.current = Date.now();

    // 发送消息到内容脚本更新静音状态
    if (activeTabId && isReplaced) {
      setIsUpdating(true);
      chrome.tabs.sendMessage(
        activeTabId,
        {
          type: 'UPDATE_AUDIO_MUTED',
          muted: newMutedState,
          previousVolume: volume / 100,
        },
        () => {
          setIsUpdating(false);
          if (chrome.runtime.lastError) {
            console.error('发送静音更新消息失败:', chrome.runtime.lastError);
            // 如果是连接断开错误，可以尝试重新连接
            if (
              chrome.runtime.lastError.message?.includes('port closed') ||
              chrome.runtime.lastError.message?.includes('disconnected')
            ) {
              console.log('连接已断开，尝试重新获取音量状态');
              // 短暂延迟后重新获取状态
              setTimeout(getVolumeStatus, 500);
            }
          }
        },
      );
    }
  }, [activeTabId, isReplaced, isMuted, volume, getVolumeStatus]);

  // 设置定期检查音量状态的定时器
  useEffect(() => {
    if (activeTabId && isReplaced) {
      // 立即获取一次音量状态
      getVolumeStatus();

      // 设置定期检查音量状态，但频率降低，避免频繁覆盖用户设置
      if (volumeCheckIntervalRef.current) {
        clearInterval(volumeCheckIntervalRef.current);
      }

      volumeCheckIntervalRef.current = window.setInterval(getVolumeStatus, 5000); // 降低到5秒检查一次

      return () => {
        if (volumeCheckIntervalRef.current) {
          clearInterval(volumeCheckIntervalRef.current);
          volumeCheckIntervalRef.current = null;
        }

        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
          updateTimeoutRef.current = null;
        }
      };
    }
    return; // 确保所有路径都有返回值
  }, [activeTabId, isReplaced, getVolumeStatus]);

  // 当isReplaced变为false时，重置状态
  useEffect(() => {
    if (!isReplaced) {
      // 不再硬编码为75，而是保持当前值或使用一个更合理的默认值
      // 如果lastUserSetVolume存在，则保持这个值
      if (lastUserSetVolume === null) {
        setVolume(50); // 使用50作为默认值，而不是75
      }
      setIsMuted(false);
      setLastUserSetVolume(null);
      userInteractionTimeRef.current = 0;
    }
  }, [isReplaced, lastUserSetVolume]);

  if (!isReplaced) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={handleMuteToggle}
          isDisabled={!isReplaced || !activeTabId}
          className="shrink-0">
          {isMuted ? (
            <IconVolumeOff className="w-5 h-5 text-gray-500" />
          ) : (
            <IconVolume className="w-5 h-5 text-blue-500" />
          )}
        </Button>

        <div className="flex-1 relative">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={e => handleVolumeChange(parseInt(e.target.value))}
            disabled={!isReplaced || !activeTabId}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          {isUpdating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <IconLoader2 className="w-4 h-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>

        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">{volume}%</div>
      </div>
    </div>
  );
};

const Audio = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReplaced, setIsReplaced] = useState(false);
  // 添加视频加载状态
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  // 添加连接状态
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.UNKNOWN);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const connectionCheckIntervalRef = useRef<number | null>(null);

  const controls = useAnimation();
  const previousUrlRef = useRef<string>('');

  // 检查连接状态的函数
  const checkConnectionStatus = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 如果没有活动标签页或不是YouTube页面，设置为断开状态
      if (!tab?.id || !tab.url?.includes('youtube.com/watch')) {
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        setActiveTabId(null);
        if (isReplaced) {
          setIsReplaced(false); // 重置替换状态
        }
        return;
      }

      // 保存当前活动标签页ID
      setActiveTabId(tab.id);

      // 发送ping消息检查内容脚本是否正常运行
      const isConnected = await new Promise<boolean>(resolve => {
        try {
          // 确保tab.id非undefined，前面已经检查过
          if (tab.id === undefined) {
            resolve(false);
            return;
          }

          // 设置超时，如果没有及时响应，认为断开连接
          const timeoutId = setTimeout(() => {
            console.log('连接检测超时');
            resolve(false);
          }, 3000); // 增加到3秒超时

          // 尝试注入内容脚本，确保它已加载
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id },
              func: () => {
                // 简单的函数，检查内容脚本是否已加载
                return true;
              },
            },
            () => {
              // 忽略可能的错误，继续尝试发送消息
              chrome.tabs.sendMessage(tab.id!, { type: 'PING_CONTENT_SCRIPT' }, response => {
                clearTimeout(timeoutId); // 清除超时计时器

                // 检查运行时错误
                if (chrome.runtime.lastError) {
                  console.log('连接检测失败:', chrome.runtime.lastError.message || '未知错误');

                  // 如果是"接收端不存在"错误，尝试重新注入内容脚本
                  const errorMessage = chrome.runtime.lastError.message || '';
                  if (errorMessage.includes('Receiving end does not exist')) {
                    console.log('内容脚本可能未正确加载，尝试重新注入');

                    // 尝试重新注入内容脚本
                    chrome.scripting.executeScript(
                      {
                        target: { tabId: tab.id! },
                        files: ['content/index.iife.js'],
                      },
                      () => {
                        if (chrome.runtime.lastError) {
                          console.error('重新注入内容脚本失败:', chrome.runtime.lastError);
                          resolve(false);
                          return;
                        }

                        console.log('内容脚本已重新注入，再次检查连接');

                        // 短暂延迟后再次尝试连接
                        setTimeout(() => {
                          chrome.tabs.sendMessage(tab.id!, { type: 'PING_CONTENT_SCRIPT' }, secondResponse => {
                            if (chrome.runtime.lastError || !secondResponse || !secondResponse.success) {
                              console.log('重新注入后连接检测仍然失败');
                              resolve(false);
                            } else {
                              console.log('重新注入后连接检测成功');
                              resolve(true);
                            }
                          });
                        }, 500);
                      },
                    );
                    return;
                  }

                  resolve(false);
                  return;
                }

                if (!response || !response.success) {
                  console.log('连接检测失败: 无响应或响应不成功');
                  resolve(false);
                  return;
                }

                console.log('连接检测成功');
                resolve(true);
              });
            },
          );
        } catch (error) {
          // 记录异常
          console.error('连接检测过程中出错:', error);
          resolve(false);
        }
      });

      setConnectionStatus(isConnected ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED);

      // 如果断开连接但之前显示为已替换状态，重置状态
      if (!isConnected && isReplaced) {
        setIsReplaced(false);
      }
    } catch (error) {
      console.error('检查连接状态时出错:', error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
  }, [isReplaced]);

  // 初始化时和标签页变化时检查连接状态
  useEffect(() => {
    // 初始检查
    checkConnectionStatus();

    // 设置定期检查
    connectionCheckIntervalRef.current = window.setInterval(checkConnectionStatus, 5000);

    // 监听标签页变化
    const handleTabChange = () => {
      checkConnectionStatus();
    };

    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
    };
  }, [checkConnectionStatus]);

  // 清理之前的 URL
  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  // 处理音频文件
  const handleAudioFile = useCallback((file: File) => {
    if (file.type.startsWith('audio/')) {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
      const newUrl = URL.createObjectURL(file);
      setAudioFile(file);
      setAudioUrl(newUrl);
      previousUrlRef.current = newUrl;
    }
  }, []);

  // 重置拖拽状态
  const resetDragState = useCallback(
    (dragState: DragState) => {
      const { setIsDragging } = dragState;
      setIsDragging(false);
      controls.start({
        scale: 1,
        transition: { duration: 0.1 },
      });
    },
    [controls],
  );

  // 处理全局拖拽事件
  useEffect(() => {
    const dragState: DragState = { isDragging, setIsDragging };

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
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        resetDragState(dragState);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetDragState(dragState);

      const file = e.dataTransfer?.files[0];
      if (file) {
        handleAudioFile(file);
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [isDragging, controls, handleAudioFile, resetDragState]);

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
      const target = e.relatedTarget as Node | null;
      const dropzone = e.currentTarget as HTMLElement;
      if (!target || !dropzone.contains(target)) {
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
      if (file) {
        handleAudioFile(file);
      }
    },
    [controls, handleAudioFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleAudioFile(file);
      }
    },
    [handleAudioFile],
  );

  const handleReplace = useCallback(async () => {
    if (!audioFile) return;

    // 先检查连接状态
    if (connectionStatus === ConnectionStatus.UNKNOWN || connectionStatus === ConnectionStatus.DISCONNECTED) {
      await checkConnectionStatus();
      if (connectionStatus === ConnectionStatus.UNKNOWN || connectionStatus === ConnectionStatus.DISCONNECTED) {
        alert('未连接到YouTube视频页面，请打开YouTube视频页面并刷新后重试');
        return;
      }
    }

    setIsReplacing(true);
    try {
      // 使用已知的活动标签页ID
      if (!activeTabId) {
        throw new Error('未找到活动标签页');
      }

      console.log('准备读取音频文件并转换为 Base64');

      // 将文件读取为 Base64 数据
      const audioData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('读取文件失败'));
          }
        };
        reader.onerror = () => reject(new Error('读取文件失败: ' + reader.error));
        reader.readAsDataURL(audioFile);
      });

      console.log('正在发送音频替换请求到标签页:', activeTabId);

      // 2. 发送消息到内容脚本，传递 Base64 数据而不是 Blob URL
      const response = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        chrome.tabs.sendMessage(
          activeTabId,
          {
            type: 'REPLACE_YOUTUBE_AUDIO',
            audioData: audioData, // 发送 Base64 编码的音频数据
            fileName: audioFile.name, // 发送文件名，便于调试
            fileType: audioFile.type, // 发送文件类型，便于播放器识别
          },
          response => {
            if (chrome.runtime.lastError) {
              // 捕获和处理 Chrome API 错误
              reject(new Error(chrome.runtime.lastError.message || '发送消息失败'));
              return;
            }
            resolve(response);
          },
        );
      });

      console.log('收到响应:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || '替换失败，未收到成功响应');
      }

      // 设置已替换状态
      setIsReplaced(true);
      // 成功后再检查一次连接状态，确保状态一致
      checkConnectionStatus();
    } catch (error: unknown) {
      console.error('替换音频失败:', error);

      // 显示更详细的错误信息
      alert(`替换失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 操作失败后检查连接状态
      checkConnectionStatus();
    } finally {
      setIsReplacing(false);
    }
  }, [audioFile, connectionStatus, activeTabId, checkConnectionStatus]);

  // 添加恢复原始音频的函数
  const handleRestore = useCallback(async () => {
    // 先检查连接状态
    if (connectionStatus === ConnectionStatus.UNKNOWN || connectionStatus === ConnectionStatus.DISCONNECTED) {
      await checkConnectionStatus();
      if (connectionStatus === ConnectionStatus.UNKNOWN || connectionStatus === ConnectionStatus.DISCONNECTED) {
        alert('与YouTube页面的连接已断开，请刷新页面后重试');
        setIsReplaced(false); // 直接重置状态
        return;
      }
    }

    setIsReplacing(true);
    try {
      // 使用已知的活动标签页ID
      if (!activeTabId) {
        throw new Error('未找到活动标签页');
      }

      console.log('正在发送恢复原音频请求到标签页:', activeTabId);

      // 发送消息到内容脚本，请求恢复原始音频
      const response = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        // 添加超时处理
        const timeoutId = setTimeout(() => {
          reject(new Error('恢复操作超时，请刷新页面重试'));
        }, 5000); // 5秒超时

        chrome.tabs.sendMessage(
          activeTabId,
          {
            type: 'RESTORE_YOUTUBE_AUDIO',
          },
          response => {
            clearTimeout(timeoutId); // 清除超时计时器

            if (chrome.runtime.lastError) {
              console.error('发送消息错误:', chrome.runtime.lastError);

              // 检查是否是消息端口关闭错误
              if (
                chrome.runtime.lastError.message?.includes('port closed') ||
                chrome.runtime.lastError.message?.includes('disconnected')
              ) {
                // 这可能意味着页面已刷新或内容脚本已卸载
                reject(new Error('与页面的连接已断开，请刷新页面后重试'));
              } else {
                reject(new Error(chrome.runtime.lastError.message || '发送消息失败'));
              }
              return;
            }

            if (!response) {
              reject(new Error('内容脚本未返回响应'));
              return;
            }

            resolve(response);
          },
        );
      });

      console.log('收到恢复响应:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || '恢复失败，未收到成功响应');
      }

      // 重置替换状态
      setIsReplaced(false);
      // 成功后再检查一次连接状态
      checkConnectionStatus();
    } catch (error: unknown) {
      console.error('恢复原音频失败:', error);

      // 根据错误类型显示不同的错误信息
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;

        // 提供更友好的错误消息
        if (errorMessage.includes('port closed') || errorMessage.includes('disconnected')) {
          errorMessage = '页面可能已刷新，请重新选择音频并替换';
        }
      }

      alert(`恢复失败: ${errorMessage}`);

      // 如果是连接已断开，直接重置状态
      if (
        error instanceof Error &&
        (error.message.includes('port closed') ||
          error.message.includes('disconnected') ||
          error.message.includes('与页面的连接已断开'))
      ) {
        setIsReplaced(false);
      }

      // 操作失败后检查连接状态
      checkConnectionStatus();
    } finally {
      setIsReplacing(false);
    }
  }, [connectionStatus, activeTabId, checkConnectionStatus]);

  const handleDelete = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      previousUrlRef.current = '';
    }
    setAudioFile(null);
    setAudioUrl('');
    setIsReplaced(false);
  }, [audioUrl]);

  // 添加消息监听器，处理视频加载状态
  useEffect(() => {
    const handleMessage = (message: { type: string; isLoading?: boolean }) => {
      if (message.type === 'VIDEO_LOADING_STATE' && typeof message.isLoading === 'boolean') {
        console.log('收到视频加载状态更新:', message.isLoading);
        setIsVideoLoading(message.isLoading);
      }
    };

    // 注册消息监听器
    chrome.runtime.onMessage.addListener(handleMessage);

    // 清理函数
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // 添加手动刷新连接的函数
  const handleRefreshConnection = useCallback(() => {
    console.log('手动刷新连接状态');
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // 渲染连接状态指示器
  const renderConnectionStatus = () => {
    if (connectionStatus === ConnectionStatus.CONNECTED) {
      return (
        <div className="flex items-center text-xs text-green-600 dark:text-green-400 gap-1">
          <IconPlugConnected className="w-3.5 h-3.5" />
          <span>已连接到 YouTube</span>
          <Button isIconOnly size="sm" variant="light" className="ml-1 p-0" onPress={handleRefreshConnection}>
            <IconRefresh className="w-3 h-3" />
          </Button>
        </div>
      );
    } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      return (
        <div className="flex items-center text-xs text-red-600 dark:text-red-400 gap-1">
          <IconPlugConnectedX className="w-3.5 h-3.5" />
          <span>未连接到 YouTube 视频页面</span>
          <Button isIconOnly size="sm" variant="light" className="ml-1 p-0" onPress={handleRefreshConnection}>
            <IconRefresh className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return null;
  };

  // 渲染替换按钮状态
  const renderReplaceButton = () => {
    // 如果视频正在加载，显示加载状态
    if (isVideoLoading && isReplaced) {
      return (
        <Button
          color="warning"
          isLoading={isReplacing}
          onPress={handleRestore}
          className="w-full"
          isDisabled={connectionStatus !== ConnectionStatus.CONNECTED}>
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
        onPress={isReplaced ? handleRestore : handleReplace}
        className="w-full"
        isDisabled={connectionStatus !== ConnectionStatus.CONNECTED}>
        {isReplaced ? '恢复原音频' : '替换 YouTube 视频音频'}
      </Button>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <Card shadow="none" className="border border-default-100">
        <CardHeader className="flex-col items-start">
          <div className="flex justify-between w-full items-center">
            <h2 className="text-lg font-medium">音频上传</h2>
            {renderConnectionStatus()}
          </div>
          <p className="text-sm text-gray-500 mt-1">支持格式：MP3, WAV, OGG</p>
        </CardHeader>
        <CardBody className="space-y-4">
          {!audioUrl ? (
            <div className="relative h-[320px]">
              <motion.div
                animate={controls}
                className={cn(
                  'absolute inset-0 rounded-xl transition-all duration-200 border-2 border-dashed',
                  isDragging
                    ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700',
                )}
                onDragEnter={handleDragEnter}
                onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}>
                <label
                  htmlFor="audio-upload"
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                  <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label="选择音频文件"
                  />
                  <div className="flex flex-col items-center gap-4">
                    <Button
                      isIconOnly
                      color="primary"
                      size="lg"
                      variant="shadow"
                      radius="full"
                      onPress={() => {
                        document.getElementById('audio-upload')?.click();
                      }}>
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
          ) : (
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

              {/* 添加音量控制组件 */}
              <VolumeControl activeTabId={activeTabId} isReplaced={isReplaced} />

              <div className="flex items-center justify-between gap-2">
                <Button isIconOnly variant="light" color="danger" onPress={handleDelete} className="shrink-0">
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
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default Audio;
