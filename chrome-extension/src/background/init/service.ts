import type { ApiRequestParams, Response as CustomResponse } from '@extension/shared';
import { apiClient, MessageTypes, registerMessageHandler } from '@extension/shared';

/**
 * 处理API请求
 * @param apiMessage API请求消息
 * @returns 响应对象
 */
async function handleApiRequest(apiParams: ApiRequestParams): Promise<CustomResponse> {
  const { method = 'get', url, data, params, config } = apiParams;

  try {
    console.log(`发送${method}请求: ${url}`);

    const response = await apiClient(url, {
      method,
      json: data,
      searchParams: params,
      ...config,
    });

    // 返回成功响应
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    // 返回错误响应
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 处理API请求消息
 */
export const initBackgroundService = () => {
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
