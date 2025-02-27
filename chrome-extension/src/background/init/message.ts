import type { ApiRequestParams, Message, Response } from '@extension/shared';
import { handleApiRequest, MessageTypes } from '@extension/shared';

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

/**
 * 处理API请求消息
 */
export const initBackgroundMessage = () => {
  registerMessageHandler(async ({ type, payload }, sender) => {
    console.log(`Background收到消息: ${type}`, sender);

    // 处理API请求消息
    if (type === MessageTypes.API_REQUEST) {
      return handleApiRequest(payload as ApiRequestParams);
    }

    // 如果消息类型未处理，返回错误
    return {
      success: false,
      error: `未处理的消息类型: ${type}`,
    };
  });

  console.log('API服务已初始化');
};
