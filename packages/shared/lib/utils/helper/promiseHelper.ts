/**
 * 睡眠
 * @param ms 毫秒
 * @returns Promise
 */
export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>(resolve => {
    const timeout = setTimeout(() => resolve(), ms);
    if (signal) {
      signal.addEventListener('abort', () => clearTimeout(timeout), { once: true });
    }
  });

/**
 * 轮询
 * @param fn 函数
 * @param interval 间隔
 * @param signal 用于终止轮询的 AbortSignal
 * @returns Promise
 */
export const poll = async <T>(fn: () => Promise<T>, interval: number, signal?: AbortSignal) => {
  while (true) {
    // 检查是否需要终止轮询
    if (signal?.aborted) {
      console.log('轮询被终止');
      return null;
    }

    try {
      const result = await fn();
      if (result !== undefined && result !== null) {
        return result;
      }
    } catch (error) {
      // 出错时继续轮询
      console.error('轮询函数出错:', error);
    }
    await sleep(interval, signal);
  }
};
