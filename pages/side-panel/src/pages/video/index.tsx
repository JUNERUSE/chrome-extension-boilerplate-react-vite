import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from '@heroui/react';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

interface Subtitle {
  startMs: number;
  durationMs: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleData {
  videoId: string;
  language: string;
  subtitles: Subtitle[];
  timestamp: number;
}

const Video: FC = () => {
  const [subtitleData, setSubtitleData] = useState<SubtitleData | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 获取当前YouTube视频ID
  useEffect(() => {
    const getCurrentTab = async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]?.url?.includes('youtube.com/watch')) {
        try {
          const url = new URL(tabs[0].url);
          const videoId = url.searchParams.get('v');
          if (videoId) {
            setCurrentVideoId(videoId);
            loadSubtitles(videoId);
          }
        } catch (err) {
          console.error('获取视频ID失败:', err);
        }
      }
    };

    getCurrentTab();
  }, []);

  // 监听storage变化，实时更新字幕
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== 'local') return;

      // 检查是否有字幕相关更新
      const subtitleKeys = Object.keys(changes).filter(key => key.startsWith('subtitles_'));
      if (subtitleKeys.length > 0) {
        // 找到当前视频的字幕更新
        if (currentVideoId) {
          const currentKey = `subtitles_${currentVideoId}`;
          if (changes[currentKey]) {
            const newValue = changes[currentKey].newValue as SubtitleData;
            setSubtitleData(newValue);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [currentVideoId]);

  // 加载字幕数据
  const loadSubtitles = (videoId: string) => {
    setLoading(true);
    setError(null);

    chrome.storage.local.get([`subtitles_${videoId}`], result => {
      const key = `subtitles_${videoId}`;
      if (result[key]) {
        setSubtitleData(result[key]);
      } else {
        setError('未找到字幕数据，请先点击YouTube播放器上的字幕按钮获取字幕');
      }
      setLoading(false);
    });
  };

  // 清空字幕数据
  const clearSubtitles = () => {
    if (!currentVideoId || !subtitleData) return;

    const key = `subtitles_${currentVideoId}`;
    chrome.storage.local.remove(key, () => {
      setSubtitleData(null);

      // 显示成功消息
      setError(null);
      setLoading(false);
      alert('字幕数据已清空');
    });
  };

  // 格式化时间为可读格式
  const formatTimeForDisplay = (timeString: string) => {
    // 将 00:00:00.000 格式转换为 00:00:00
    return timeString.split('.')[0];
  };

  // 复制字幕到剪贴板
  const copySubtitles = () => {
    if (!subtitleData) return;

    const formattedSubtitles = subtitleData.subtitles
      .map((subtitle, index) => {
        return `${index + 1}\n${subtitle.startTime} --> ${subtitle.endTime}\n${subtitle.text}\n`;
      })
      .join('\n');

    navigator.clipboard
      .writeText(formattedSubtitles)
      .then(() => {
        alert('字幕已复制到剪贴板');
      })
      .catch(err => {
        console.error('复制字幕失败:', err);
        alert('复制字幕失败');
      });
  };

  return (
    <div className="flex flex-col w-full h-full p-4 overflow-auto">
      {loading && (
        <div className="flex justify-center items-center py-8">
          <Spinner size="lg" color="primary" />
        </div>
      )}

      {error && (
        <Alert className="mb-4" color="danger">
          {error}
        </Alert>
      )}

      {subtitleData && (
        <>
          <Card className="mb-4">
            <CardHeader className="flex gap-3">
              <div>
                <p className="text-md font-semibold">字幕信息</p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">视频ID:</span> {subtitleData.videoId}
                </p>
                <p>
                  <span className="font-semibold">语言:</span> {subtitleData.language}
                </p>
                <p>
                  <span className="font-semibold">字幕数量:</span> {subtitleData.subtitles.length}
                </p>
                <div className="flex space-x-2 mt-4">
                  <Button color="primary" onPress={copySubtitles}>
                    复制所有字幕
                  </Button>
                  <Button color="danger" variant="flat" onPress={clearSubtitles}>
                    清空字幕
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {subtitleData.subtitles.map((subtitle, index) => (
                  <div key={index} className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatTimeForDisplay(subtitle.startTime)} - {formatTimeForDisplay(subtitle.endTime)}
                      </span>
                    </div>
                    <p className="mt-2">{subtitle.text}</p>
                    {index !== subtitleData.subtitles.length - 1 && <Divider className="mt-3" />}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {!subtitleData && !loading && !error && currentVideoId && (
        <Card className="w-full">
          <CardBody className="flex flex-col items-center justify-center py-8">
            <p className="text-center mb-2">还没有字幕数据</p>
            <p className="text-center text-default-500">请点击YouTube播放器上的字幕按钮来获取字幕</p>
          </CardBody>
        </Card>
      )}

      {!currentVideoId && !loading && (
        <Card className="w-full">
          <CardBody className="flex flex-col items-center justify-center py-8">
            <p className="text-center text-default-500">请打开一个YouTube视频页面</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

export default Video;
