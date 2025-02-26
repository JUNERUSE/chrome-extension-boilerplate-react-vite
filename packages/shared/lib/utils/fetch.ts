import { MessageTypes } from '../constants/background.js';
import type { ApiRequestParams } from '../types/index.js';
import { sendMessageToBackground } from './messaging.js';

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
