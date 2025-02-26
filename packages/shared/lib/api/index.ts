import ky from 'ky';

import type { ApiOptions } from '../types/index.js';

// 创建默认API选项
const defaultOptions: ApiOptions = {
  timeout: 30000,
  retries: 2,
};

/**
 * 创建一个预配置的ky实例
 */
export const createApiClient = (options: ApiOptions = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };

  return ky.create({
    timeout: mergedOptions.timeout,
    headers: mergedOptions.headers,
    retry: {
      limit: mergedOptions.retries || 2,
      methods: ['get', 'post', 'put', 'delete', 'patch'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
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
  });
};

// 导出默认API客户端实例
export const apiClient = createApiClient();
