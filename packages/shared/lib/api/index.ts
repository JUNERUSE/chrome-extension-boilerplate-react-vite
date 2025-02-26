import type { Options } from 'ky';
import ky from 'ky';

/**
 * 创建一个预配置的ky实例
 */
export const createApiClient = (options?: Options) =>
  ky.create({
    hooks: {
      beforeRequest: [
        request => {
          // 可以在此处添加请求拦截器逻辑
          console.log('发送请求:', request.url);
        },
      ],
      afterResponse: [
        (_request, _options, response) => {
          // 可以在此处添加响应拦截器逻辑
          console.log('收到响应:', response.status);
          return response;
        },
      ],
      beforeError: [
        error => {
          // 错误处理
          console.error('API请求错误:', error.message);
          return error;
        },
      ],
    },
    ...options,
  });

// 导出默认API客户端实例
export const apiClient = createApiClient();
