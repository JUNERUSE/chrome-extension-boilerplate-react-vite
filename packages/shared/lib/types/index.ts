import type { Input, Options, SearchParamsOption } from 'ky';

// 定义消息类型
export interface Message<T = unknown> {
  type: string;
  payload?: T;
}

// 定义响应类型
export interface Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// API请求相关类型
export interface ApiOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

// 请求参数接口
export interface ApiRequestParams<Config = Options, Data = object, Params = SearchParamsOption> {
  url: Input;
  method?: Options['method'];
  data?: Data;
  params?: Params;
  config?: Config;
}
