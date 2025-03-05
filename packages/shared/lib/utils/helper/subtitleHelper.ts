import { LANGUAGE_CODE_MAPPING, REVERSE_LANGUAGE_CODE_MAPPING } from '../../constants/language.js';
import type { SubtitleItem } from '../db/subtitles.js';

// 字幕项接口
interface Subtitle extends SubtitleItem {
  id?: string;
}

/**
 * 合并相邻的字幕
 * @param subtitles 字幕数组
 * @param maxTimeDiff 允许合并的最大时间差（毫秒）
 * @returns 合并后的字幕数组
 */
export function mergeSubtitles(subtitles: Subtitle[], maxTimeDiff: number = 300): Subtitle[] {
  if (!subtitles || subtitles.length <= 1) {
    return subtitles;
  }

  // 按开始时间排序
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);

  const result: Subtitle[] = [];
  let current = sortedSubtitles[0];

  for (let i = 1; i < sortedSubtitles.length; i++) {
    const next = sortedSubtitles[i];

    // 检查是否应该合并
    // 条件1: 当前字幕的结束时间与下一个字幕的开始时间之差小于最大允许差值
    // 条件2: 或者下一个字幕的开始时间小于当前字幕的结束时间（重叠）
    if (next.startTime - current.endTime <= maxTimeDiff || next.startTime <= current.endTime) {
      // 合并字幕
      current = {
        id: `${current.id}_${next.id}`,
        startTime: current.startTime,
        endTime: Math.max(current.endTime, next.endTime),
        text: current.text + next.text,
      };
    } else {
      // 如果不合并，将当前字幕添加到结果中，并将下一个字幕设为当前字幕
      result.push(current);
      current = next;
    }
  }

  // 添加最后一个处理的字幕
  result.push(current);

  return result;
}

/**
 * 智能合并字幕，考虑语义完整性
 * @param subtitles 字幕数组
 * @param maxTimeDiff 允许合并的最大时间差（毫秒）
 * @param maxLength 合并后字幕的最大长度
 * @returns 合并后的字幕数组
 */
export function smartMergeSubtitles(
  subtitles: Subtitle[],
  config?: { maxTimeDiff?: number; maxLength?: number },
): Subtitle[] {
  if (!subtitles || subtitles.length <= 1) {
    return subtitles;
  }

  const { maxTimeDiff = 300, maxLength = 100 } = config || {};

  // 按开始时间排序
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);

  const result: Subtitle[] = [];
  let current = sortedSubtitles[0];
  let currentTextLength = current.text.length;

  for (let i = 1; i < sortedSubtitles.length; i++) {
    const next = sortedSubtitles[i];
    const mergedTextLength = currentTextLength + next.text.length + 1; // +1 for space

    // 检查是否应该合并
    // 条件1: 时间接近或重叠
    // 条件2: 合并后的文本长度不超过最大长度
    if (
      (next.startTime - current.endTime <= maxTimeDiff || next.startTime <= current.endTime) &&
      mergedTextLength <= maxLength
    ) {
      // 合并字幕
      current = {
        id: `${current.id}_${next.id}`,
        startTime: current.startTime,
        endTime: Math.max(current.endTime, next.endTime),
        text: current.text + next.text,
      };
      currentTextLength = current.text.length;
    } else {
      // 如果不合并，将当前字幕添加到结果中，并将下一个字幕设为当前字幕
      result.push(current);
      current = next;
      currentTextLength = current.text.length;
    }
  }

  // 添加最后一个处理的字幕
  result.push(current);

  return result;
}

/**
 * 根据句子完整性合并字幕
 * @param subtitles 字幕数组
 * @returns 合并后的字幕数组
 */
export function mergeBySentence(subtitles: Subtitle[]): Subtitle[] {
  if (!subtitles || subtitles.length <= 1) {
    return subtitles;
  }

  // 按开始时间排序
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);

  const result: Subtitle[] = [];
  let current = sortedSubtitles[0];

  const sentenceEndMarks = ['.', '。', '!', '！', '?', '？'];

  for (let i = 1; i < sortedSubtitles.length; i++) {
    const next = sortedSubtitles[i];

    // 检查当前字幕文本是否以句子结束标记结尾
    const endsWithMark = sentenceEndMarks.some(mark => current.text.endsWith(mark));

    if (!endsWithMark && (next.startTime - current.endTime <= 1000 || next.startTime <= current.endTime)) {
      // 如果当前字幕不是完整的句子结束，且时间接近或重叠，则合并
      current = {
        id: `${current.id}_${next.id}`,
        startTime: current.startTime,
        endTime: Math.max(current.endTime, next.endTime),
        text: current.text + next.text,
      };
    } else {
      // 如果当前字幕是完整的句子，或时间间隔较大，则不合并
      result.push(current);
      current = next;
    }
  }

  // 添加最后一个处理的字幕
  result.push(current);

  return result;
}

/**
 * 修复字幕时间重叠问题
 * @param subtitles 待修复的字幕数组
 * @returns 修复后的字幕数组
 */
export function fixOverlappingSubtitles(subtitles: Subtitle[]): Subtitle[] {
  if (!subtitles || subtitles.length <= 1) {
    return subtitles;
  }

  // 首先按开始时间排序
  const sortedSubtitles = [...subtitles].sort((a, b) => a.startTime - b.startTime);

  // 修复重叠问题
  for (let i = 1; i < sortedSubtitles.length; i++) {
    const prev = sortedSubtitles[i - 1];
    const current = sortedSubtitles[i];

    // 如果当前字幕的开始时间小于前一个字幕的结束时间，调整当前字幕的开始时间
    if (current.startTime < prev.endTime) {
      current.startTime = prev.endTime;

      // 如果调整后开始时间大于结束时间，也需要调整结束时间
      if (current.startTime > current.endTime) {
        current.endTime = current.startTime + 1000; // 为字幕预留至少1秒的显示时间
      }
    }
  }

  return sortedSubtitles;
}

/**
 * 合并字幕并修复时间重叠问题
 * @param jsonData 字幕数据
 * @param algorithm 合并算法，可选值为 'mergeSubtitles'、'smartMergeSubtitles' 或 'mergeBySentence'
 * @returns 合并后的字幕数组
 */
export function mergeSubtitlesAndFixOverlapping(
  jsonData: Subtitle[],
  algorithm: 'mergeSubtitles' | 'smartMergeSubtitles' | 'mergeBySentence' = 'smartMergeSubtitles',
): Subtitle[] {
  // 可以根据需要选择不同的合并策略
  // let merged = mergeSubtitles(jsonData);
  // let merged = smartMergeSubtitles(jsonData);
  let mergedAlgorithm = mergeBySentence;
  switch (algorithm) {
    case 'mergeSubtitles':
      mergedAlgorithm = mergeSubtitles;
      break;
    case 'smartMergeSubtitles':
      mergedAlgorithm = smartMergeSubtitles;
      break;
    case 'mergeBySentence':
      mergedAlgorithm = mergeBySentence;
      break;
  }

  return fixOverlappingSubtitles(mergedAlgorithm(jsonData));
}

/**
 * 获取YouTube字幕语言代码对应的标准语言代码
 * @param youtubeCode YouTube的languageCode
 * @returns 对应的标准语言代码，如果没有映射则返回原始代码
 */
export function getStandardLanguageCode(youtubeCode: string): string {
  return LANGUAGE_CODE_MAPPING[youtubeCode] || youtubeCode;
}

/**
 * 获取标准语言代码对应的YouTube字幕语言代码
 * @param standardCode 标准语言代码
 * @returns 对应的YouTube languageCode，如果没有映射则返回原始代码
 */
export function getYouTubeLanguageCode(standardCode: string): string {
  return REVERSE_LANGUAGE_CODE_MAPPING[standardCode] || standardCode;
}
