import type { Options } from 'ky';
import { useCallback, useMemo, useState } from 'react';
import type { SWRConfiguration } from 'swr';
import useSWR from 'swr';

import { MessageTypes } from '../constants/background.js';
import type { ApiRequestParams, Response } from '../types/index.js';
import { fetchForBackground } from '../utils/fetch/index.js';
import { sendMessageToBackground } from '../utils/messaging.js';

// 扩展的 SWR 配置，作为 ApiRequestParams 的 config 参数类型
interface UseBackgroundFetchOptions {
  key?: string;
  fetchConfig?: Options;
  swrConfig?: SWRConfiguration;
}

type UseBackgroundFetchParams = {
  key?: string;
} & ApiRequestParams<UseBackgroundFetchOptions>;

/**
 * 使用SWR包装的Chrome API请求钩子
 * @param params 请求参数对象
 * @returns SWR响应对象
 */
export function useSWRBackgroundFetch<TResponse = unknown>(params: UseBackgroundFetchParams) {
  const { key, config, ...rest } = params;
  const { fetchConfig, swrConfig } = config || ({} as UseBackgroundFetchOptions);
  const { errorRetryCount = 3, revalidateOnFocus = false, ...swrOptions } = swrConfig || ({} as SWRConfiguration);

  const memoKey = useMemo(() => {
    return key ? key : JSON.stringify({ url: rest.url, method: rest.method, data: rest.data });
  }, [key, rest.url, rest.method, rest.data]);

  return useSWR<Response<TResponse>, Error>(
    memoKey,
    async () => {
      const res = await sendMessageToBackground<TResponse, ApiRequestParams>({
        type: MessageTypes.API_REQUEST,
        payload: { ...params, config: fetchConfig },
      });

      if (!res.success) {
        console.error('请求失败', res.error);
        throw new Error(res.error);
      }

      return res;
    },
    {
      errorRetryCount,
      revalidateOnFocus,
      ...swrOptions,
    },
  );
}

/**
 * 手动触发的Chrome API请求钩子
 * @param initialParams 初始请求参数对象（可选）
 * @returns 包含触发函数和状态的对象
 */
export function useManualBackgroundFetch<TResponse = unknown>(params: ApiRequestParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Response<TResponse> | null>(null);

  const sendRequest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchForBackground<TResponse>(params);
      setData(response);
      return response;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  return {
    sendRequest,
    data,
    error,
    isLoading,
    reset: useCallback(() => {
      setData(null);
      setError(null);
      setIsLoading(false);
    }, []),
  };
}
