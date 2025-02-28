import type { SubtitleData, SubtitleItem } from './db';

export interface YouTubeSubtitleEvent {
  tStartMs: number;
  dDurationMs: number;
  segs: Array<{ utf8: string }>;
}

// 提取视频ID的函数
export const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
};

// 检查当前页面是否是YouTube视频页面
export const isYouTubeVideoPage = (): boolean => {
  const url = window.location.href;
  return url.includes('youtube.com/watch') && !!getYouTubeVideoId(url);
};

// 获取YouTube视频字幕
export const getYouTubeSubtitles = async (videoId: string, lang = 'zh-CN'): Promise<SubtitleData | null> => {
  try {
    // 1. 获取视频页面HTML
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();

    // 2. 从HTML中提取ytInitialPlayerResponse对象
    const ytInitialPlayerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/,
    );
    if (!ytInitialPlayerResponseMatch) {
      throw new Error('无法提取YouTube播放器信息');
    }

    const playerData = JSON.parse(ytInitialPlayerResponseMatch[1]);
    const videoTitle = playerData.videoDetails.title;

    // 3. 获取字幕轨道
    if (
      !playerData.captions ||
      !playerData.captions.playerCaptionsTracklistRenderer ||
      !playerData.captions.playerCaptionsTracklistRenderer.captionTracks
    ) {
      throw new Error('该视频没有可用字幕');
    }

    const captionTracks = playerData.captions.playerCaptionsTracklistRenderer.captionTracks;

    // 4. 优先选择指定语言的字幕，如果没有则选择可用的第一个字幕
    let selectedTrack = captionTracks.find((track: { languageCode: string }) => track.languageCode === lang);
    if (!selectedTrack) {
      // 如果没有找到指定语言，尝试使用第一个可用的字幕轨道
      selectedTrack = captionTracks[0];
    }

    if (!selectedTrack) {
      throw new Error('找不到可用的字幕轨道');
    }

    // 5. 构建字幕URL并请求字幕数据（使用json3格式）
    const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    const captionResponse = await fetch(captionUrl);
    const captionData = await captionResponse.json();

    // 6. 处理字幕数据
    const subtitleItems: SubtitleItem[] = captionData.events
      .filter((event: YouTubeSubtitleEvent) => event.segs && event.segs.length > 0)
      .map((event: YouTubeSubtitleEvent) => {
        return {
          startTime: event.tStartMs,
          endTime: event.tStartMs + event.dDurationMs,
          text: event.segs
            .map(seg => seg.utf8)
            .join(' ')
            .trim(),
        };
      });

    // 7. 构建最终的字幕数据对象
    const subtitleData: SubtitleData = {
      videoId,
      title: videoTitle,
      language: selectedTrack.languageCode,
      items: subtitleItems,
      timestamp: Date.now(),
    };

    return subtitleData;
  } catch (error) {
    console.error('获取YouTube字幕失败:', error);
    return null;
  }
};
