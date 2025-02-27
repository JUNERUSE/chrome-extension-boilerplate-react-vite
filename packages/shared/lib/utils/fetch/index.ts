import { apiClient } from '../../api/index.js';
import { MessageTypes } from '../../constants/background.js';
import type { ApiRequestParams, Response } from '../../types/index.js';
import { sendMessageToBackground } from '../messaging.js';

/**
 * 从后台请求数据
 * @param params 请求参数对象
 * @returns Promise，解析为响应对象
 */
export const fetchForBackground = async <TResponse = unknown>(params: ApiRequestParams) =>
  sendMessageToBackground<TResponse>({
    type: MessageTypes.API_REQUEST,
    payload: params,
  });

/**
 * 处理API请求
 * @param apiMessage API请求消息
 * @returns 响应对象
 */
export async function handleApiRequest<TResponse = unknown>(apiParams: ApiRequestParams): Promise<Response<TResponse>> {
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
      data: await response.json<TResponse>(),
    };
  } catch (error) {
    // 返回错误响应
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}
