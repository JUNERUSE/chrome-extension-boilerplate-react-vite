/**
 * 将秒数转换为分:秒格式
 */
export const formatTime = (time: number): string => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
};

/**
 * 根据总时长将百分比转换为时间（秒）
 */
export const percentToTime = (percent: number, duration: number): number => {
  return (percent * duration) / 100;
};

/**
 * 根据当前时间和总时长计算进度百分比
 */
export const calculateProgressPercentage = (currentTime: number, duration: number): number => {
  return duration ? (currentTime / duration) * 100 : 0;
};
