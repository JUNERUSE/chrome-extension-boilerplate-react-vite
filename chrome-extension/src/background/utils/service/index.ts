import type { ApiRequestParams, Response as CustomResponse } from '@extension/shared';
import { apiClient } from '@extension/shared';

/**
 * 处理API请求
 * @param apiMessage API请求消息
 * @returns 响应对象
 */
export async function handleApiRequest(apiParams: ApiRequestParams): Promise<CustomResponse> {
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
