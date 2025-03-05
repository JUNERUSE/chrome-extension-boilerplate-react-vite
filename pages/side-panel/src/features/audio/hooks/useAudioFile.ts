import type { AudioCacheItem } from '@extension/shared';
import { audioCacheDB, extractVideoId, isYoutubeVideoPage } from '@extension/shared';
import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ConnectionStatus } from './useConnectionStatus';

export interface AudioFileState {
  audioFile: File | null;
  audioUrl: string;
  isReplacing: boolean;
  isReplaced: boolean;
  isVideoLoading: boolean;
  isInitialized: boolean;
  handleAudioFile: (file: File) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleReplace: () => Promise<void>;
  handleRestore: () => Promise<void>;
  handleDelete: () => void;
  currentVideoIdRef: RefObject<string | null>;
}

export const useAudioFile = (
  connectionStatus: ConnectionStatus,
  activeTabId: number | null,
  checkConnectionStatus: () => Promise<void>,
): AudioFileState => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [isReplaced, setIsReplaced] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousUrlRef = useRef<string>('');
  const currentVideoIdRef = useRef<string | null>(null);
  const isYoutubeVideoPageRef = useRef<boolean>(false);

  // 清理之前的 URL
  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
      }
    };
  }, []);

  // 检查当前视频是否已被替换音频
  const checkCurrentVideoReplaced = useCallback(async (): Promise<boolean> => {
    if (!activeTabId) return false;

    try {
      // 发送消息到内容脚本，检查当前视频是否已被替换音频
      return await new Promise<boolean>(resolve => {
        const timeoutId = setTimeout(() => {
          console.log('检查替换状态超时');
          resolve(false);
        }, 3000);

        try {
          chrome.tabs.sendMessage(activeTabId, { type: 'CHECK_AUDIO_REPLACED' }, response => {
            clearTimeout(timeoutId);

            if (chrome.runtime.lastError) {
              console.log('检查替换状态失败:', chrome.runtime.lastError.message);
              resolve(false);
              return;
            }

            if (!response) {
              console.log('检查替换状态未收到响应');
              resolve(false);
              return;
            }

            console.log('检查替换状态结果:', response.isReplaced);
            resolve(response.isReplaced === true);
          });
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('检查替换状态出错:', error);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('检查当前视频替换状态失败:', error);
      return false;
    }
  }, [activeTabId]);

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

    // 检查是否是YouTube视频页面
    if (!isYoutubeVideoPageRef.current) {
      alert('当前不是YouTube视频页面，无法替换音频');
      return;
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
        // 添加超时处理
        const timeoutId = setTimeout(() => {
          reject(new Error('替换操作超时，请刷新页面重试'));
        }, 10000); // 10秒超时，音频文件可能较大

        try {
          chrome.tabs.sendMessage(
            activeTabId,
            {
              type: 'REPLACE_YOUTUBE_AUDIO',
              audioData: audioData, // 发送 Base64 编码的音频数据
              fileName: audioFile.name, // 发送文件名，便于调试
              fileType: audioFile.type, // 发送文件类型，便于播放器识别
            },
            response => {
              clearTimeout(timeoutId); // 清除超时计时器

              if (chrome.runtime.lastError) {
                // 捕获和处理 Chrome API 错误
                console.error('发送消息错误:', chrome.runtime.lastError);

                // 检查是否是消息端口关闭错误
                if (
                  chrome.runtime.lastError.message?.includes('port closed') ||
                  chrome.runtime.lastError.message?.includes('disconnected') ||
                  chrome.runtime.lastError.message?.includes('Receiving end does not exist')
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
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      console.log('收到响应:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || '替换失败，未收到成功响应');
      }

      // 设置已替换状态
      setIsReplaced(true);

      // 如果当前在YouTube视频页面，缓存音频数据
      if (currentVideoIdRef.current) {
        try {
          // 获取当前标签页的标题作为视频标题
          const tab = await chrome.tabs.get(activeTabId);
          const videoTitle = tab.title?.replace(' - YouTube', '') || '未知视频';

          // 创建缓存项
          const cacheItem: AudioCacheItem = {
            videoId: currentVideoIdRef.current,
            title: videoTitle,
            audioData: audioData,
            fileType: audioFile.type,
            fileName: audioFile.name,
            timestamp: Date.now(),
          };

          // 保存到缓存
          await audioCacheDB.saveAudioCache(cacheItem);
          console.log('音频已缓存:', currentVideoIdRef.current);
        } catch (error) {
          console.error('缓存音频失败:', error);
        }
      }

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
  }, [audioFile, connectionStatus, activeTabId, checkConnectionStatus, isYoutubeVideoPageRef]);

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

        try {
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
                  chrome.runtime.lastError.message?.includes('disconnected') ||
                  chrome.runtime.lastError.message?.includes('Receiving end does not exist')
                ) {
                  // 这可能意味着页面已刷新或内容脚本已卸载
                  // 对于恢复操作，如果连接已断开，我们可以直接重置状态
                  setIsReplaced(false);
                  resolve({ success: true }); // 假装成功，因为我们已经重置了状态
                  return;
                } else {
                  reject(new Error(chrome.runtime.lastError.message || '发送消息失败'));
                  return;
                }
              }

              if (!response) {
                reject(new Error('内容脚本未返回响应'));
                return;
              }

              resolve(response);
            },
          );
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      console.log('收到响应:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || '恢复失败，未收到成功响应');
      }

      // 重置状态
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
    // 如果当前音频已替换视频音频，先恢复原始音频
    if (isReplaced && activeTabId) {
      // 发送消息到内容脚本，请求恢复原始音频
      chrome.tabs.sendMessage(
        activeTabId,
        {
          type: 'RESTORE_YOUTUBE_AUDIO',
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('发送恢复音频消息错误:', chrome.runtime.lastError);
            // 即使出错也继续删除本地音频文件
          }
          console.log('恢复原音频响应:', response);
        },
      );
    }

    // 删除本地音频文件
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      previousUrlRef.current = '';
    }

    // 重置状态
    setAudioFile(null);
    setAudioUrl('');
    setIsReplaced(false);

    // 如果有视频ID，尝试删除缓存
    if (currentVideoIdRef.current) {
      try {
        audioCacheDB
          .deleteAudioCache(currentVideoIdRef.current)
          .then(() => console.log('已删除音频缓存:', currentVideoIdRef.current))
          .catch(err => console.error('删除音频缓存失败:', err));
      } catch (error) {
        console.error('删除音频缓存时出错:', error);
      }
    }
  }, [audioUrl, isReplaced, activeTabId, currentVideoIdRef]);

  // 检查当前标签页并尝试加载缓存的音频
  const checkCurrentTabAndLoadCache = useCallback(async () => {
    // 设置为未初始化状态
    setIsInitialized(false);

    if (!activeTabId) {
      // 如果没有活动标签页，重置所有状态
      isYoutubeVideoPageRef.current = false;
      if (isReplaced) {
        setIsReplaced(false);
      }
      // 完全重置状态，包括音频文件和URL
      if (audioFile || audioUrl) {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          previousUrlRef.current = '';
        }
        setAudioFile(null);
        setAudioUrl('');
      }
      currentVideoIdRef.current = null;

      // 非YouTube页面，立即设置为已初始化状态
      setIsInitialized(true);
      return;
    }

    try {
      // 获取当前标签页信息
      const tab = await chrome.tabs.get(activeTabId);
      if (!tab.url) {
        // 如果没有URL，重置所有状态
        isYoutubeVideoPageRef.current = false;
        if (isReplaced) {
          setIsReplaced(false);
        }
        // 完全重置状态，包括音频文件和URL
        if (audioFile || audioUrl) {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            previousUrlRef.current = '';
          }
          setAudioFile(null);
          setAudioUrl('');
        }
        currentVideoIdRef.current = null;

        // 非YouTube页面，立即设置为已初始化状态
        setIsInitialized(true);
        return;
      }

      // 检查是否是YouTube视频页面
      const isYoutubePage = isYoutubeVideoPage(tab.url);
      isYoutubeVideoPageRef.current = isYoutubePage;

      if (!isYoutubePage) {
        // 如果不是YouTube视频页面，重置所有状态
        if (isReplaced) {
          console.log('当前不是YouTube视频页面，重置替换状态');
          setIsReplaced(false);
        }
        // 完全重置状态，包括音频文件和URL
        if (audioFile || audioUrl) {
          console.log('当前不是YouTube视频页面，重置音频文件');
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            previousUrlRef.current = '';
          }
          setAudioFile(null);
          setAudioUrl('');
        }
        currentVideoIdRef.current = null;

        // 非YouTube页面，立即设置为已初始化状态
        console.log('非YouTube页面，立即设置为已初始化状态');
        setIsInitialized(true);
        return;
      }

      // 提取视频ID
      const videoId = extractVideoId(tab.url);
      if (!videoId) {
        console.error('无法从URL提取视频ID:', tab.url);
        currentVideoIdRef.current = null;
        // 重置所有状态
        if (isReplaced) {
          setIsReplaced(false);
        }
        if (audioFile || audioUrl) {
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            previousUrlRef.current = '';
          }
          setAudioFile(null);
          setAudioUrl('');
        }

        // YouTube页面但无法提取视频ID，设置为已初始化状态
        console.log('YouTube页面但无法提取视频ID，设置为已初始化状态');
        setIsInitialized(true);
        return;
      }

      console.log('检测到YouTube视频页面，视频ID:', videoId);

      // 如果视频ID没有变化，检查替换状态并更新
      if (videoId === currentVideoIdRef.current) {
        // 检查当前视频是否已被替换音频
        const isCurrentlyReplaced = await checkCurrentVideoReplaced();
        if (isCurrentlyReplaced !== isReplaced) {
          console.log('检测到替换状态变化:', isCurrentlyReplaced);
          setIsReplaced(isCurrentlyReplaced);
        }

        // 视频ID没有变化，设置为已初始化状态
        console.log('视频ID没有变化，设置为已初始化状态');
        setIsInitialized(true);
        return;
      }

      console.log('检测到视频ID变化:', videoId);

      // 更新当前视频ID
      currentVideoIdRef.current = videoId;

      // 检查当前视频是否已被替换音频
      const isCurrentlyReplaced = await checkCurrentVideoReplaced();
      console.log('当前视频替换状态:', isCurrentlyReplaced);
      setIsReplaced(isCurrentlyReplaced);

      // 重置当前音频状态，为新视频准备
      if (audioFile || audioUrl) {
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          previousUrlRef.current = '';
        }
        setAudioFile(null);
        setAudioUrl('');
      }

      // 尝试从缓存加载音频
      const cachedAudio = await audioCacheDB.getAudioCache(videoId);
      if (cachedAudio) {
        console.log('找到缓存的音频:', cachedAudio.fileName);

        // 创建文件对象
        const fileBlob = await fetch(cachedAudio.audioData).then(r => r.blob());
        const file = new File([fileBlob], cachedAudio.fileName, { type: cachedAudio.fileType });

        // 设置音频文件
        if (previousUrlRef.current) {
          URL.revokeObjectURL(previousUrlRef.current);
        }
        const newUrl = URL.createObjectURL(file);
        setAudioFile(file);
        setAudioUrl(newUrl);
        previousUrlRef.current = newUrl;

        // 只有在连接状态正常且当前未替换音频时才自动替换音频
        if (connectionStatus === ConnectionStatus.CONNECTED && !isCurrentlyReplaced) {
          // 自动替换音频
          setIsReplacing(true);
          try {
            // 发送消息到内容脚本，传递 Base64 数据
            const response = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('替换操作超时，请刷新页面重试'));
              }, 10000); // 10秒超时

              try {
                chrome.tabs.sendMessage(
                  activeTabId,
                  {
                    type: 'REPLACE_YOUTUBE_AUDIO',
                    audioData: cachedAudio.audioData,
                    fileName: cachedAudio.fileName,
                    fileType: cachedAudio.fileType,
                  },
                  response => {
                    clearTimeout(timeoutId);

                    if (chrome.runtime.lastError) {
                      console.error('发送消息错误:', chrome.runtime.lastError);
                      if (
                        chrome.runtime.lastError.message?.includes('port closed') ||
                        chrome.runtime.lastError.message?.includes('disconnected') ||
                        chrome.runtime.lastError.message?.includes('Receiving end does not exist')
                      ) {
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
              } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
              }
            });

            if (!response || !response.success) {
              throw new Error(response?.error || '替换失败，未收到成功响应');
            }

            // 设置已替换状态
            setIsReplaced(true);
          } catch (error) {
            console.error('自动替换音频失败:', error);
          } finally {
            setIsReplacing(false);
          }
        }

        // 缓存加载完成，设置为已初始化状态
        console.log('缓存加载完成，设置为已初始化状态');
        setIsInitialized(true);
      } else {
        console.log('未找到缓存的音频，保持初始状态');
        // 没有缓存，设置为已初始化状态
        console.log('没有缓存，设置为已初始化状态');
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('检查当前标签页并加载缓存失败:', error);
      // 即使出错也设置为已初始化状态
      console.log('出错，设置为已初始化状态');
      setIsInitialized(true);
    }
  }, [activeTabId, connectionStatus, isReplaced, audioFile, audioUrl, checkCurrentVideoReplaced]);

  // 监听标签页变化，自动加载缓存
  useEffect(() => {
    // 每次标签页变化时，先设置为未初始化状态
    setIsInitialized(false);

    // 初始检查
    checkCurrentTabAndLoadCache();

    // 监听标签页变化
    const handleTabChange = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url && tabId === activeTabId) {
        // 标签页URL变化时，先设置为未初始化状态
        setIsInitialized(false);
        checkCurrentTabAndLoadCache();
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabChange);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabChange);
    };
  }, [activeTabId, checkCurrentTabAndLoadCache]);

  // 监听连接状态变化
  useEffect(() => {
    // 当连接状态变化时，先设置为未初始化状态
    setIsInitialized(false);

    // 重新检查当前标签页
    checkCurrentTabAndLoadCache();
  }, [connectionStatus, checkCurrentTabAndLoadCache]);

  // 添加消息监听器，处理视频加载状态和页面变化
  useEffect(() => {
    const handleMessage = (message: { type: string; isLoading?: boolean; isYoutubePage?: boolean; url?: string }) => {
      if (message.type === 'VIDEO_LOADING_STATE' && typeof message.isLoading === 'boolean') {
        console.log('收到视频加载状态更新:', message.isLoading);
        setIsVideoLoading(message.isLoading);
      } else if (message.type === 'PAGE_CHANGE') {
        console.log('收到页面变化通知:', message.isYoutubePage ? 'YouTube页面' : '非YouTube页面', message.url);
        // 页面变化时，先设置为未初始化状态
        setIsInitialized(false);
        // 触发重新检查当前标签页和缓存
        checkCurrentTabAndLoadCache();
      }
    };

    // 注册消息监听器
    chrome.runtime.onMessage.addListener(handleMessage);

    // 清理函数
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [checkCurrentTabAndLoadCache]);

  return {
    audioFile,
    audioUrl,
    isReplacing,
    isReplaced,
    isVideoLoading,
    isInitialized,
    handleAudioFile,
    handleFileChange,
    handleReplace,
    handleRestore,
    handleDelete,
    currentVideoIdRef,
  };
};
