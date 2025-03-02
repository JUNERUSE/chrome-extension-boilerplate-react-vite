import type { SubtitleData, SubtitleItem } from './db';

export interface YouTubeSubtitleEvent {
  tStartMs: number;
  dDurationMs: number;
  segs: Array<{ utf8: string }>;
}

export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: {
    simpleText: string;
  };
  vssId: string;
  isTranslatable: boolean;
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

// 获取YouTube视频的所有可用字幕语言
export const getAvailableSubtitleLanguages = async (videoId: string): Promise<CaptionTrack[]> => {
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
    console.log('视频信息:', {
      title: playerData.videoDetails?.title,
      id: playerData.videoDetails?.videoId,
      hasCaptions: !!playerData.captions,
    });

    // 3. 获取字幕轨道
    if (!playerData.captions || !playerData.captions.playerCaptionsTracklistRenderer) {
      console.warn('该视频没有标准字幕轨道，尝试查找其他字幕来源');

      // 尝试从其他位置查找字幕信息
      const captionTracksMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionTracksMatch && captionTracksMatch[1]) {
        try {
          const captionTracks = JSON.parse(captionTracksMatch[1]);
          console.log('从HTML中提取到的字幕轨道:', captionTracks);
          return captionTracks;
        } catch (e) {
          console.error('解析字幕轨道JSON失败:', e);
        }
      }

      return [];
    }

    const captionsRenderer = playerData.captions.playerCaptionsTracklistRenderer;
    console.log('字幕渲染器信息:', {
      hasCaptionTracks: !!captionsRenderer.captionTracks,
      trackCount: captionsRenderer.captionTracks?.length || 0,
      hasAudioTracks: !!captionsRenderer.audioTracks,
      hasTranslationLanguages: !!captionsRenderer.translationLanguages,
    });

    // 收集所有可用的字幕轨道
    let allTracks: CaptionTrack[] = [];

    // 添加手动添加的字幕
    if (captionsRenderer.captionTracks) {
      allTracks = [...captionsRenderer.captionTracks];
      console.log(
        '手动添加的字幕轨道:',
        captionsRenderer.captionTracks.map((track: CaptionTrack) => ({
          code: track.languageCode,
          name: track.name?.simpleText,
          vssId: track.vssId,
        })),
      );
    }

    // 添加自动生成的字幕
    if (captionsRenderer.audioTracks) {
      console.log('音频轨道:', captionsRenderer.audioTracks);

      for (const audioTrack of captionsRenderer.audioTracks) {
        if (audioTrack.captionTrackIndices) {
          for (const index of audioTrack.captionTrackIndices) {
            if (captionsRenderer.captionTracks && captionsRenderer.captionTracks[index]) {
              // 确保不重复添加
              const track = captionsRenderer.captionTracks[index];
              if (!allTracks.some(t => t.vssId === track.vssId)) {
                allTracks.push(track);
                console.log('添加音频轨道关联的字幕:', {
                  code: track.languageCode,
                  name: track.name?.simpleText,
                  vssId: track.vssId,
                });
              }
            }
          }
        }

        // 检查是否有自动生成的字幕
        if (audioTrack.defaultCaptionTrackIndices) {
          for (const index of audioTrack.defaultCaptionTrackIndices) {
            if (captionsRenderer.captionTracks && captionsRenderer.captionTracks[index]) {
              const track = captionsRenderer.captionTracks[index];
              if (!allTracks.some(t => t.vssId === track.vssId)) {
                allTracks.push(track);
                console.log('添加默认字幕轨道:', {
                  code: track.languageCode,
                  name: track.name?.simpleText,
                  vssId: track.vssId,
                });
              }
            }
          }
        }
      }
    }

    // 添加翻译字幕
    if (captionsRenderer.translationLanguages) {
      console.log('可用的翻译语言:', captionsRenderer.translationLanguages);

      // 将翻译语言添加到可用语言列表中
      // 首先检查是否有原始字幕轨道可以翻译
      if (allTracks.length > 0 && captionsRenderer.translationLanguages.length > 0) {
        // 获取第一个可翻译的字幕轨道
        const translatableTrack = allTracks.find(track => track.isTranslatable);

        if (translatableTrack) {
          console.log('找到可翻译的字幕轨道:', translatableTrack.languageCode);

          // 为每种翻译语言创建一个虚拟的字幕轨道
          for (const translationLang of captionsRenderer.translationLanguages) {
            if (translationLang.languageCode && translationLang.languageName) {
              // 构建翻译字幕的URL
              const translationUrl = `${translatableTrack.baseUrl}&tlang=${translationLang.languageCode}`;

              // 创建一个新的字幕轨道对象
              const translationTrack: CaptionTrack = {
                baseUrl: translationUrl,
                languageCode: translationLang.languageCode,
                name: {
                  simpleText: translationLang.languageName.simpleText || translationLang.languageCode,
                },
                vssId: `${translatableTrack.vssId}.${translationLang.languageCode}`,
                isTranslatable: false, // 翻译后的字幕不能再次翻译
              };

              // 确保不重复添加
              if (!allTracks.some(t => t.languageCode === translationTrack.languageCode)) {
                allTracks.push(translationTrack);
                // console.log(`添加翻译字幕: ${translationTrack.languageCode} (${translationTrack.name.simpleText})`);
              }
            }
          }
        }
      }
    }

    // 如果没有找到任何字幕轨道，尝试查找自动生成的字幕
    if (allTracks.length === 0 && playerData.captions) {
      // 查找自动生成的字幕
      const autoGeneratedTracks = Object.values(playerData.captions)
        .filter(item => typeof item === 'object' && item !== null)
        .flatMap(item => {
          if (item && typeof item === 'object' && 'captionTracks' in item) {
            // 使用类型断言而不是 any
            return ((item as Record<string, unknown>).captionTracks as CaptionTrack[]) || [];
          }
          return [];
        });

      if (autoGeneratedTracks.length > 0) {
        console.log('找到自动生成的字幕轨道:', autoGeneratedTracks);
        allTracks = [...autoGeneratedTracks];
      }
    }

    // 如果仍然没有找到字幕，尝试其他方法
    if (allTracks.length === 0) {
      // 尝试从timedtext API获取字幕信息
      const timedTextUrlMatch = html.match(/"captionTracks":\[(.*?)\]/);
      if (timedTextUrlMatch && timedTextUrlMatch[1]) {
        try {
          // 解析字幕轨道信息
          const tracksJson = JSON.parse(`[${timedTextUrlMatch[1]}]`);
          console.log('从timedtext API获取到的字幕轨道:', tracksJson);
          allTracks = tracksJson;
        } catch (e) {
          console.error('解析timedtext字幕信息失败:', e);
        }
      }
    }

    // 确保所有轨道都有必要的属性
    const validTracks = allTracks.filter(track => {
      const captionTrack = track as unknown as CaptionTrack;
      return (
        captionTrack &&
        captionTrack.baseUrl &&
        captionTrack.languageCode &&
        (captionTrack.name || (captionTrack.name = { simpleText: captionTrack.languageCode }))
      );
    });

    if (validTracks.length === 0 && allTracks.length > 0) {
      console.warn('找到字幕轨道但缺少必要属性:', allTracks);
    }

    console.log(`最终获取到 ${validTracks.length} 个有效字幕轨道`);
    return validTracks;
  } catch (error) {
    console.error('获取YouTube字幕语言列表失败:', error);
    return [];
  }
};

// 获取YouTube视频字幕
export const getYouTubeSubtitles = async (videoId: string, lang = 'zh-CN'): Promise<SubtitleData | null> => {
  try {
    // 获取所有可用的字幕轨道
    const captionTracks = await getAvailableSubtitleLanguages(videoId);
    console.log(`获取到 ${captionTracks.length} 个字幕轨道，请求语言: ${lang}`);

    if (!captionTracks || captionTracks.length === 0) {
      console.error('该视频没有可用字幕');
      return null;
    }

    // 获取视频标题
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    const ytInitialPlayerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/,
    );
    if (!ytInitialPlayerResponseMatch) {
      throw new Error('无法提取YouTube播放器信息');
    }
    const playerData = JSON.parse(ytInitialPlayerResponseMatch[1]);
    const videoTitle = playerData.videoDetails.title;

    // 查找匹配的字幕轨道
    let selectedTrack = null;

    // 1. 尝试精确匹配
    selectedTrack = captionTracks.find(t => t.languageCode === lang);

    // 2. 尝试部分匹配（例如 'en' 可以匹配 'en-US'）
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(t => t.languageCode.startsWith(lang) || lang.startsWith(t.languageCode));
      if (selectedTrack) {
        console.log(`找到部分匹配的字幕轨道: ${selectedTrack.languageCode}`);
      }
    }

    // 3. 针对英语的特殊处理
    if (!selectedTrack && (lang === 'en' || lang.startsWith('en-'))) {
      // 尝试找自动生成的英语字幕
      selectedTrack = captionTracks.find(t => t.vssId && t.vssId.includes('a.en'));
      if (selectedTrack) {
        console.log(`找到自动生成的英语字幕: ${selectedTrack.languageCode}`);
      }
    }

    // 4. 针对中文的特殊处理
    if (!selectedTrack && (lang === 'zh-CN' || lang === 'zh-Hans' || lang.startsWith('zh'))) {
      // 尝试找自动生成的中文字幕
      selectedTrack = captionTracks.find(t => t.vssId && (t.vssId.includes('a.zh') || t.vssId.includes('a.zh-CN')));
      if (selectedTrack) {
        console.log(`找到自动生成的中文字幕: ${selectedTrack.languageCode}`);
      }
    }

    // 5. 如果仍然没有找到，使用第一个可用的字幕轨道
    if (!selectedTrack && captionTracks.length > 0) {
      selectedTrack = captionTracks[0];
      console.warn(`未找到 ${lang} 语言的字幕轨道，使用第一个可用的字幕轨道: ${selectedTrack.languageCode}`);
    }

    if (!selectedTrack) {
      console.error('找不到可用的字幕轨道');
      return null;
    }

    // 构建字幕URL并请求字幕数据（使用json3格式）
    const captionUrl = `${selectedTrack.baseUrl}&fmt=json3`;
    console.log(`请求字幕URL: ${captionUrl}`);

    const subtitleResponse = await fetch(captionUrl);
    const subtitleData = await subtitleResponse.json();

    // 处理字幕数据
    if (!subtitleData || !subtitleData.events) {
      console.error('字幕数据格式不正确');
      return null;
    }

    // 将YouTube字幕格式转换为我们的格式
    const subtitleItems: SubtitleItem[] = subtitleData.events
      .filter((event: YouTubeSubtitleEvent) => event.segs && event.tStartMs !== undefined)
      .map((event: YouTubeSubtitleEvent) => {
        const startTime = event.tStartMs;
        const endTime = startTime + (event.dDurationMs || 0);
        const text = event.segs
          .map(seg => seg.utf8)
          .join('')
          .trim();

        return {
          id: `${startTime}-${endTime}`,
          startTime,
          endTime,
          text,
        };
      })
      .filter((item: SubtitleItem) => item.text); // 过滤掉空文本

    // 构建最终的字幕数据对象
    const result: SubtitleData = {
      videoId: videoId,
      title: videoTitle,
      language: selectedTrack.languageCode,
      items: subtitleItems,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error('获取YouTube字幕失败:', error);
    return null;
  }
};

// 获取多语言字幕
export const getMultiLanguageSubtitles = async (
  videoId: string,
  languages: string[] = ['en', 'zh-CN'],
): Promise<Record<string, SubtitleData | null>> => {
  try {
    // 获取所有可用的字幕轨道
    const captionTracks = await getAvailableSubtitleLanguages(videoId);
    console.log(`获取到 ${captionTracks.length} 个字幕轨道，请求语言:`, languages);

    if (!captionTracks || captionTracks.length === 0) {
      console.error('该视频没有可用字幕');
      return {};
    }

    // 获取视频标题
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await response.text();
    const ytInitialPlayerResponseMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/,
    );
    if (!ytInitialPlayerResponseMatch) {
      throw new Error('无法提取YouTube播放器信息');
    }
    const playerData = JSON.parse(ytInitialPlayerResponseMatch[1]);
    const videoTitle = playerData.videoDetails.title;

    // 为每种请求的语言获取字幕
    const result: Record<string, SubtitleData | null> = {};

    // 过滤掉无效的语言代码
    const validLanguages = languages.filter(lang => lang && lang !== 'no-secondary' && lang !== 'no-option');

    // 如果没有指定有效语言，则获取所有可用语言的字幕
    const targetLanguages = validLanguages.length > 0 ? validLanguages : captionTracks.map(track => track.languageCode);

    // 记录所有可用的语言，用于调试
    console.log(
      '可用的字幕语言:',
      captionTracks.map(track => ({
        code: track.languageCode,
        name: track.name?.simpleText || 'Unknown',
        vssId: track.vssId,
        isTranslatable: track.isTranslatable,
      })),
    );
    console.log('目标语言:', targetLanguages);

    await Promise.all(
      targetLanguages.map(async lang => {
        try {
          // 查找匹配的字幕轨道，支持部分匹配（例如 'en' 可以匹配 'en-US'）
          let track = captionTracks.find(t => t.languageCode === lang);
          console.log(`查找 ${lang} 语言的字幕轨道:`, track ? '找到精确匹配' : '未找到精确匹配');

          // 如果没有找到精确匹配，尝试部分匹配
          if (!track) {
            track = captionTracks.find(t => t.languageCode.startsWith(lang) || lang.startsWith(t.languageCode));
            if (track) {
              console.log(`找到部分匹配的字幕轨道: ${track.languageCode}`);
            }
          }

          // 如果仍然没有找到，但请求的是英语，尝试找自动生成的英语字幕
          if (!track && (lang === 'en' || lang.startsWith('en-'))) {
            track = captionTracks.find(t => t.vssId && t.vssId.includes('a.en'));
            if (track) {
              console.log(`找到自动生成的英语字幕: ${track.languageCode}`);
            }
          }

          // 如果仍然没有找到，但请求的是中文，尝试找自动生成的中文字幕
          if (!track && (lang === 'zh-CN' || lang === 'zh-Hans' || lang.startsWith('zh'))) {
            track = captionTracks.find(t => t.vssId && (t.vssId.includes('a.zh') || t.vssId.includes('a.zh-CN')));
            if (track) {
              console.log(`找到自动生成的中文字幕: ${track.languageCode}`);
            }
          }

          // 如果仍然没有找到，尝试查找翻译字幕
          if (!track) {
            // 查找可以翻译成目标语言的字幕轨道
            const translatableTrack = captionTracks.find(t => t.isTranslatable);
            if (translatableTrack) {
              console.log(`尝试使用翻译: 从 ${translatableTrack.languageCode} 翻译到 ${lang}`);
              // 构建翻译字幕的URL
              const translationUrl = `${translatableTrack.baseUrl}&tlang=${lang}`;
              track = {
                baseUrl: translationUrl,
                languageCode: lang,
                name: {
                  simpleText: `${translatableTrack.name.simpleText} (翻译为 ${lang})`,
                },
                vssId: `${translatableTrack.vssId}.${lang}`,
                isTranslatable: false,
              };
            }
          }

          if (track) {
            try {
              // 构建字幕URL并请求字幕数据
              const captionUrl = `${track.baseUrl}&fmt=json3`;
              console.log(`获取 ${lang} 字幕，URL:`, captionUrl);

              const captionResponse = await fetch(captionUrl);
              const captionData = await captionResponse.json();

              // 处理字幕数据
              const subtitleItems: SubtitleItem[] = captionData.events
                .filter((event: YouTubeSubtitleEvent) => event.segs && event.segs.length > 0)
                .map((event: YouTubeSubtitleEvent) => {
                  return {
                    startTime: event.tStartMs,
                    endTime: event.tStartMs + event.dDurationMs,
                    text: event.segs
                      .map(seg => seg.utf8)
                      .join('')
                      .trim(),
                  };
                })
                .filter((item: SubtitleItem) => item.text); // 过滤掉空文本

              // 构建字幕数据对象
              result[lang] = {
                videoId,
                title: videoTitle,
                language: track.languageCode,
                items: subtitleItems,
                timestamp: Date.now(),
              };

              console.log(`成功获取 ${lang} 字幕，共 ${subtitleItems.length} 条`);
            } catch (error) {
              console.error(`获取 ${lang} 语言字幕失败:`, error);
              result[lang] = null;
            }
          } else {
            console.warn(`未找到 ${lang} 语言的字幕轨道`);
            result[lang] = null;
          }
        } catch (error) {
          console.error(`处理 ${lang} 语言字幕时出错:`, error);
          result[lang] = null;
        }
      }),
    );

    return result;
  } catch (error) {
    console.error('获取多语言字幕失败:', error);
    return {};
  }
};
