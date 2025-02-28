import { Button } from '@heroui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@heroui/card';
import { Form } from '@heroui/form';
import { Input } from '@heroui/input';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

import SubtitleViewer, { type SubtitleViewerRef } from '../../features/subtitles/components/subtitle-viewer';
import { subtitleDB } from '../../features/subtitles/utils/db';

// 定义tab更新事件的changeInfo类型
interface TabChangeInfo {
  url?: string;
  status?: string;
  pinned?: boolean;
  audible?: boolean;
  discarded?: boolean;
  autoDiscardable?: boolean;
  mutedInfo?: { muted: boolean };
  favIconUrl?: string;
  title?: string;
}

// 定义来自background的消息类型
interface BackgroundMessage {
  type: string;
  url?: string;
}

const Video: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [inputValue, setInputValue] = useState('');
  const subtitleViewerRef = useRef<SubtitleViewerRef>(null);

  // 检测当前标签页是否为YouTube视频页面
  useEffect(() => {
    const checkCurrentTab = async () => {
      try {
        // 获取当前活动的Chrome标签页
        const queryOptions = { active: true, currentWindow: true };
        const [tab] = await chrome.tabs.query(queryOptions);

        if (tab && tab.url && tab.url.includes('youtube.com/watch')) {
          setVideoUrl(tab.url);
          setInputValue(tab.url);
        }
      } catch (error) {
        console.error('获取当前标签页失败:', error);
      }
    };

    checkCurrentTab();

    // 监听标签页更新事件
    const handleTabUpdate = async (tabId: number, changeInfo: TabChangeInfo) => {
      if (changeInfo.url) {
        const url = changeInfo.url;
        if (url.includes('youtube.com/watch')) {
          setVideoUrl(url);
          setInputValue(url);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    // 监听来自background的消息
    const handleBackgroundMessage = (message: BackgroundMessage) => {
      if (message.type === 'YOUTUBE_VIDEO_DETECTED' && message.url) {
        setVideoUrl(message.url);
        setInputValue(message.url);
      }
    };

    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // 使用内部 state 的值
      if (inputValue) {
        // 验证是否是有效的 YouTube 视频链接
        if (!inputValue.includes('youtube.com/watch') && !inputValue.includes('youtu.be/')) {
          subtitleViewerRef.current?.reset();
          console.error('请输入有效的 YouTube 视频链接');
          return;
        }
        setVideoUrl(inputValue);
        return;
      }

      // 如果输入框为空，则尝试获取当前标签页 URL
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.url?.includes('youtube.com/watch')) {
        const url = activeTab.url;
        setVideoUrl(url);
        setInputValue(url);
        return;
      }

      console.error('请输入 YouTube 视频链接或打开 YouTube 视频页面');
    } catch (error) {
      console.error('获取视频信息失败:', error);
    }
  };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // 清除所有字幕数据
      await subtitleDB.clearAllSubtitles();
      // 重置所有状态
      setVideoUrl('');
      setInputValue('');
      // 重置 SubtitleViewer 组件状态
      subtitleViewerRef.current?.reset();
    } catch (error) {
      console.error('重置失败:', error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card shadow="none" className="border border-default-100">
        <CardHeader className="flex flex-col gap-3 items-stretch">
          <h2 className="text-lg font-medium text-foreground">视频解析</h2>
        </CardHeader>

        <CardBody className="gap-2">
          <Form onSubmit={handleSubmit} onReset={handleReset} className="items-stretch">
            <Input
              label="链接"
              type="url"
              name="videoUrl"
              placeholder="输入YouTube视频URL"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              fullWidth
            />
            <div className="flex gap-2 flex-1">
              <Button type="reset" variant="flat" fullWidth>
                重置
              </Button>
              <Button type="submit" color="primary" fullWidth>
                加载
              </Button>
            </div>
          </Form>
        </CardBody>
        <CardFooter className="text-sm text-gray-500">
          在YouTube上打开视频时，将自动获取字幕。您也可以手动输入视频URL并点击加载。
        </CardFooter>
      </Card>

      <SubtitleViewer ref={subtitleViewerRef} videoUrl={videoUrl} />
    </div>
  );
};

export default Video;
