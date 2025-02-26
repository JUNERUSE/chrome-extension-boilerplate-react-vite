import type { ApiRequestParams, Response as CustomResponse } from '@extension/shared';
import { apiClient, MessageTypes, registerMessageHandler } from '@extension/shared';

/**
 * 执行HTTP请求
 * @param method 请求方法
 * @param url 请求URL
 * @param data 请求数据
 * @param params 查询参数
 * @param headers 请求头
 * @returns 响应结果
 */
async function executeRequest({ method = 'GET', url, data, params, config }: ApiRequestParams): Promise<unknown> {
  switch (method) {
    case 'GET':
      return await apiClient.get(url, { searchParams: params, ...config }).json();
    case 'POST':
      return await apiClient.post(url, { json: data, ...config }).json();
    case 'PUT':
      return await apiClient.put(url, { json: data, ...config }).json();
    case 'DELETE':
      return await apiClient.delete(url, { json: data, ...config }).json();
    case 'PATCH':
      return await apiClient.patch(url, { json: data, ...config }).json();
    default:
      throw new Error(`不支持的HTTP方法: ${method}`);
  }
}

/**
 * 处理API请求
 * @param apiMessage API请求消息
 * @returns 响应对象
 */
async function handleApiRequest(apiParams: ApiRequestParams): Promise<CustomResponse> {
  const { method = 'GET', url, data, params, config } = apiParams;

  try {
    console.log(`发送${method}请求: ${url}`);

    const response = await executeRequest({ method: method, url, data, params, config });

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
