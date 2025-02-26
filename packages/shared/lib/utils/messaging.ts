import type { Message, Response } from '../types/index.js';

/**
 * 从前端发送消息到background
 * @param message 消息对象
 * @returns Promise包含响应
 */
export const sendMessageToBackground = <R = unknown, T = unknown>(message: Message<T>): Promise<Response<R>> => {
  return new Promise(resolve => {
    try {
      // 设置超时处理
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: '消息响应超时',
        });
      }, 30000);

      chrome.runtime.sendMessage(message, (response: Response<R> | undefined) => {
        clearTimeout(timeoutId);

        // 检查runtime错误
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          return resolve({
            success: false,
            error: runtimeError.message,
          });
        }

        // 检查响应
        if (!response) {
          return resolve({
            success: false,
            error: '无响应',
          });
        }

        if (!response.success) {
          return resolve({
            success: false,
            error: response.error || '未知错误',
          });
        }

        resolve(response);
      });
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};

/**
 * 在background中注册消息处理器
 * @param handler 消息处理函数
 */
export const registerMessageHandler = <T = unknown, R = unknown>(
  handler: (message: Message<T>, sender: chrome.runtime.MessageSender) => Promise<Response<R>>,
): void => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 返回true表示将异步发送响应
    const promise = handler(message, sender);

    promise
      .then(response => {
        sendResponse(response);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true; // 重要：告诉Chrome我们会异步发送响应
  });
};
