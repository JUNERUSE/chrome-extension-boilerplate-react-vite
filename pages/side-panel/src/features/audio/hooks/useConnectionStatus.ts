import { useCallback, useEffect, useRef, useState } from 'react';

// 连接状态枚举
export enum ConnectionStatus {
  UNKNOWN = 'unknown',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

export interface ConnectionState {
  connectionStatus: ConnectionStatus;
  activeTabId: number | null;
  checkConnectionStatus: () => Promise<void>;
  handleRefreshConnection: () => void;
}

// 检查是否是YouTube视频页面
const isYoutubeVideoPage = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) ||
      urlObj.hostname.includes('youtu.be')
    );
  } catch (error) {
    console.error('解析URL失败:', error);
    return false;
  }
};

export const useConnectionStatus = (): ConnectionState => {
  // 添加连接状态
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.UNKNOWN);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const connectionCheckIntervalRef = useRef<number | null>(null);

  // 检查连接状态的函数
  const checkConnectionStatus = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // 如果没有活动标签页或不是YouTube视频页面，设置为断开状态
      if (!tab?.id || !tab.url || !isYoutubeVideoPage(tab.url)) {
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        setActiveTabId(null);
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
    } catch (error) {
      console.error('检查连接状态时出错:', error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
  }, []);

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

    // 监听页面变化消息
    const handleMessage = (message: { type: string; isYoutubePage?: boolean }) => {
      if (message.type === 'PAGE_CHANGE') {
        console.log('连接状态钩子收到页面变化通知，重新检查连接状态');
        checkConnectionStatus();
      }
    };

    chrome.tabs.onActivated.addListener(handleTabChange);
    chrome.tabs.onUpdated.addListener(handleTabChange);
    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      chrome.tabs.onActivated.removeListener(handleTabChange);
      chrome.tabs.onUpdated.removeListener(handleTabChange);
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [checkConnectionStatus]);

  // 添加手动刷新连接的函数
  const handleRefreshConnection = useCallback(() => {
    console.log('手动刷新连接状态');
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  return {
    connectionStatus,
    activeTabId,
    checkConnectionStatus,
    handleRefreshConnection,
  };
};
