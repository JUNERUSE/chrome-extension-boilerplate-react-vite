import { sampleFunction } from '@src/sampleFunction';

console.log('content script loaded');

// Shows how to call a function defined in another module
sampleFunction();

// YouTube字幕获取功能
if (window.location.href.includes('youtube.com/watch')) {
  console.log('YouTube视频页面检测到，准备添加字幕按钮');

  // 使用setInterval持续检查并尝试添加按钮
  const buttonAddedInterval = setInterval(() => {
    const controlsSelector = '.ytp-right-controls';
    const playerControls = document.querySelector(controlsSelector);

    if (!playerControls) {
      console.log('未找到播放器控制栏，继续等待...');
      return;
    }

    // 如果按钮已存在，停止间隔
    if (document.querySelector('.ytp-subtitle-button')) {
      console.log('字幕按钮已存在，停止检查');
      clearInterval(buttonAddedInterval);
      return;
    }

    console.log('找到播放器控制栏，尝试添加字幕按钮');

    try {
      // 创建字幕按钮
      const subtitleButton = document.createElement('button');
      subtitleButton.className = 'ytp-button ytp-subtitle-button';
      subtitleButton.setAttribute('aria-label', '获取字幕');
      subtitleButton.title = '获取字幕';

      // 调整样式以匹配YouTube原生按钮
      subtitleButton.style.backgroundColor = 'transparent'; // 透明背景
      subtitleButton.style.color = 'inherit';
      subtitleButton.style.border = 'none';
      subtitleButton.style.padding = '0';
      subtitleButton.style.cursor = 'pointer';

      // 使用SVG图标，与YouTube风格一致
      subtitleButton.innerHTML = `
        <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
          <path d="M11,11 L25,11 L25,13 L11,13 Z M14,15 L22,15 L22,17 L14,17 Z M11,19 L25,19 L25,21 L11,21 Z M14,23 L22,23 L22,25 L14,25 Z" fill="white"></path>
        </svg>
      `;

      // 添加悬停效果
      subtitleButton.addEventListener('mouseenter', () => {
        const path = subtitleButton.querySelector('path');
        if (path) {
          path.setAttribute('fill', '#ff0000'); // 悬停时变红
        }
      });

      subtitleButton.addEventListener('mouseleave', () => {
        const path = subtitleButton.querySelector('path');
        if (path) {
          path.setAttribute('fill', 'white'); // 离开时恢复白色
        }
      });

      // 添加点击事件
      subtitleButton.addEventListener('click', event => {
        event.stopPropagation(); // 防止事件冒泡

        console.log('字幕按钮被点击');

        // 获取当前视频ID
        const videoId = new URL(window.location.href).searchParams.get('v');

        if (!videoId) {
          console.error('无法获取视频ID');
          return;
        }

        // 获取并打印字幕
        getSubtitles(videoId);

        // 显示YouTube风格的提示
        showYouTubeStyleToast('正在获取字幕...');
      });

      // 添加到播放器控制栏
      // 找到一个合适的位置插入按钮
      const miniplayerButton = playerControls.querySelector('.ytp-miniplayer-button');
      const fullscreenButton = playerControls.querySelector('.ytp-fullscreen-button');

      if (miniplayerButton) {
        // 放置在画中画按钮之前
        playerControls.insertBefore(subtitleButton, miniplayerButton);
      } else if (fullscreenButton) {
        // 或者放置在全屏按钮之前
        playerControls.insertBefore(subtitleButton, fullscreenButton);
      } else {
        // 如果都找不到，添加到控制栏末尾
        playerControls.appendChild(subtitleButton);
      }
      console.log('字幕按钮已成功添加');

      // 按钮添加成功，清除间隔
      clearInterval(buttonAddedInterval);
    } catch (error) {
      console.error('添加按钮时出错:', error);
    }
  }, 1000); // 每秒检查一次

  // 60秒后停止尝试添加按钮，防止无限循环
  setTimeout(() => {
    if (buttonAddedInterval) {
      clearInterval(buttonAddedInterval);
      console.log('停止尝试添加字幕按钮');
    }
  }, 60000);
}

// 定义字幕相关接口
interface Subtitle {
  startMs: number;
  durationMs: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface YouTubeSegment {
  utf8: string;
}

interface YouTubeSubtitleEvent {
  tStartMs: number;
  dDurationMs: number;
  segs: YouTubeSegment[];
}

interface YouTubePlayerResponse {
  videoDetails: {
    videoId: string;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{
        languageCode: string;
        name?: { simpleText: string };
        baseUrl: string;
      }>;
    };
  };
}

// 获取视频字幕
function getSubtitles(videoId: string) {
  try {
    console.log('正在获取视频字幕，视频ID:', videoId);

    // 获取ytInitialPlayerResponse对象
    let player: YouTubePlayerResponse =
      (window as Window & { ytInitialPlayerResponse?: YouTubePlayerResponse }).ytInitialPlayerResponse ||
      ({} as YouTubePlayerResponse);

    // 如果没有直接获取到，尝试从页面HTML中解析
    if (!player || player.videoDetails.videoId !== videoId) {
      const YT_INITIAL_PLAYER_RESPONSE_RE =
        /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
      const pageHtml = document.documentElement.innerHTML;
      const match = pageHtml.match(YT_INITIAL_PLAYER_RESPONSE_RE);

      if (match && match[1]) {
        try {
          player = JSON.parse(match[1]) as YouTubePlayerResponse;
        } catch (e) {
          console.error('解析ytInitialPlayerResponse失败:', e);
          showYouTubeStyleToast('解析视频数据失败');
          return;
        }
      }
    }

    if (!player || !player.captions) {
      console.error('无法获取视频数据或该视频没有字幕');
      showYouTubeStyleToast('该视频可能没有字幕');
      return;
    }

    // 获取字幕轨道
    const captionTracks: Array<{
      languageCode: string;
      name?: { simpleText: string };
      baseUrl: string;
    }> = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (!captionTracks || captionTracks.length === 0) {
      console.error('该视频没有可用字幕');
      showYouTubeStyleToast('该视频没有可用字幕');
      return;
    }

    // 选择字幕轨道（优先选择中文或英文）
    let selectedTrack = captionTracks.find(
      track => track.languageCode === 'zh-Hans' || track.languageCode === 'zh-CN' || track.languageCode === 'zh',
    );
    if (!selectedTrack) {
      selectedTrack = captionTracks.find(track => track.languageCode === 'en');
    }
    if (!selectedTrack) {
      selectedTrack = captionTracks[0]; // 如果没有中文或英文，选择第一个
    }

    console.log('选择字幕语言:', selectedTrack.languageCode, selectedTrack.name?.simpleText);
    showYouTubeStyleToast(`正在获取${selectedTrack.name?.simpleText || ''}字幕...`);

    // 获取字幕内容
    fetch(`${selectedTrack.baseUrl}&fmt=json3`)
      .then(response => response.json())
      .then(data => {
        if (!data || !data.events) {
          showYouTubeStyleToast('字幕数据格式异常');
          return;
        }

        // 处理字幕数据
        const subtitles = data.events
          .filter((event: YouTubeSubtitleEvent) => event.segs) // 过滤有效字幕段
          .map((event: YouTubeSubtitleEvent) => {
            return {
              startMs: event.tStartMs,
              durationMs: event.dDurationMs,
              startTime: formatMilliseconds(event.tStartMs),
              endTime: formatMilliseconds(event.tStartMs + event.dDurationMs),
              text: event.segs
                .map((seg: YouTubeSegment) => seg.utf8)
                .join(' ')
                .trim(),
            };
          })
          .filter((subtitle: Subtitle) => subtitle.text); // 过滤空字幕

        console.log('成功获取字幕数据，共', subtitles.length, '条');

        // 打印字幕数据
        printSubtitles(subtitles, videoId, selectedTrack.languageCode);

        // 保存当前获取的字幕
        chrome.runtime.sendMessage({
          action: 'saveSubtitles',
          data: {
            videoId,
            language: selectedTrack.languageCode,
            subtitles,
          },
        });

        showYouTubeStyleToast(`成功获取${subtitles.length}条字幕`);
      })
      .catch(error => {
        console.error('获取字幕数据失败:', error);
        showYouTubeStyleToast('获取字幕数据失败');
      });
  } catch (error) {
    console.error('获取字幕时出错:', error);
    showYouTubeStyleToast('获取字幕时出错');
  }
}

// 格式化毫秒为时间字符串 (HH:MM:SS.mmm)
function formatMilliseconds(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const milliseconds = ms % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// 打印字幕
function printSubtitles(
  subtitles: Array<{ startMs: number; durationMs: number; startTime: string; endTime: string; text: string }>,
  videoId: string,
  language: string,
) {
  // 创建一个格式化的字幕文本
  const formattedSubtitles = subtitles
    .map((subtitle, index) => {
      return `${index + 1}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n`;
    })
    .join('\n');

  // 发送到后台脚本进行打印
  chrome.runtime.sendMessage({
    action: 'printSubtitle',
    data: {
      videoId: videoId,
      language: language,
      fullText: formattedSubtitles,
      subtitles: subtitles,
    },
  });
}

// 显示YouTube风格的提示toast
function showYouTubeStyleToast(message: string) {
  // 移除已有的toast
  const existingToast = document.querySelector('.youtube-style-toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }

  // 创建一个YouTube风格的toast
  const toast = document.createElement('div');
  toast.className = 'youtube-style-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(33, 33, 33, 0.9);
    color: white;
    padding: 10px 16px;
    border-radius: 2px;
    z-index: 9999;
    font-family: 'YouTube Noto', Roboto, Arial, sans-serif;
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    pointer-events: none;
  `;
  toast.textContent = message;

  // 添加到页面
  document.body.appendChild(toast);

  // 显示toast
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // 3秒后淡出
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
}
