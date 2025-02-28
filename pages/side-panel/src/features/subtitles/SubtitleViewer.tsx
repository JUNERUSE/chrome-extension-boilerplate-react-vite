import { Alert } from '@heroui/alert';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { Progress } from '@heroui/progress';
import { Select, SelectItem } from '@heroui/select';
import { IconArrowUp } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';

import type { SubtitleData, SubtitleItem } from './db';
import { subtitleDB } from './db';
import { getYouTubeSubtitles, getYouTubeVideoId } from './youtube-subtitles';

interface SubtitleViewerProps {
  videoUrl?: string;
}

const ITEMS_PER_PAGE = 50; // 每页显示的字幕条数

export interface SubtitleViewerRef {
  reset: () => void;
}

const SubtitleViewer = forwardRef<SubtitleViewerRef, SubtitleViewerProps>(({ videoUrl }, ref) => {
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleData | null>(null);
  const [language, setLanguage] = useState('en');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const languageOptions = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: '英文' },
    { value: 'ja', label: '日文' },
    { value: 'ko', label: '韩文' },
    { value: 'fr', label: '法文' },
    { value: 'de', label: '德文' },
  ];

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      await subtitleDB.clearAllSubtitles();
      setSubtitles(null);
      setError(null);
      handleRefresh();
    } catch (err) {
      setError('清除缓存时出错：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 过滤有效的字幕条目
  const validSubtitleItems = subtitles?.items.filter(item => item.text && item.text.trim().length > 0) || [];

  // 获取当前页的字幕
  const currentPageItems = validSubtitleItems.slice(0, page * ITEMS_PER_PAGE);

  // 处理滚动加载
  const handleScroll = useCallback(() => {
    if (loading || !hasMore) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // 显示/隐藏返回顶部按钮
    setShowBackToTop(scrollTop > 300);

    // 当滚动到距离底部100px时加载更多
    if (documentHeight - scrollTop - windowHeight < 100) {
      if (page * ITEMS_PER_PAGE < validSubtitleItems.length) {
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    }
  }, [loading, hasMore, page, validSubtitleItems.length]);

  // 返回顶部
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 重置组件状态的方法
  const reset = useCallback(() => {
    setSubtitles(null);
    setError(null);
    setPage(1);
    setHasMore(true);
    setShowBackToTop(false);
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    reset,
  }));

  useEffect(() => {
    if (!videoUrl) {
      setError('请输入YouTube视频链接');
      return;
    }

    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) {
      setError('无效的YouTube视频链接');
      reset();
      return;
    }

    const fetchSubtitles = async () => {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);

      // 启动模拟进度
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      try {
        // 首先尝试从IndexedDB获取字幕
        const cachedSubtitles = await subtitleDB.getSubtitles(videoId);

        if (cachedSubtitles && cachedSubtitles.language === language) {
          setSubtitles(cachedSubtitles);
        } else {
          // 如果没有缓存或者语言不匹配，则从YouTube获取
          const newSubtitles = await getYouTubeSubtitles(videoId, language);

          if (newSubtitles) {
            // 保存到IndexedDB
            await subtitleDB.saveSubtitles(newSubtitles);
            setSubtitles(newSubtitles);
          } else {
            setError('无法获取视频字幕，请确保视频有字幕');
          }
        }
      } catch (err) {
        setError('获取字幕时出错：' + (err instanceof Error ? err.message : String(err)));
      } finally {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setTimeout(() => {
          setLoading(false);
          setLoadingProgress(0);
        }, 200);
      }
    };

    fetchSubtitles();
    setPage(1); // 重置页码
    setHasMore(true); // 重置加载状态
  }, [videoUrl, language, refreshTrigger, reset]);

  // 添加页面滚动监听
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <>
      <Card shadow="none" className="border border-default-100">
        {/* 头部区域：标题和控制按钮 */}
        <CardHeader className="flex flex-col gap-3 items-stretch">
          <h2 className="text-lg font-medium text-foreground">{subtitles ? subtitles.title : '视频字幕'}</h2>
        </CardHeader>

        <CardBody>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              label="语言"
              defaultSelectedKeys={[language]}
              onChange={e => setLanguage(e.target.value)}
              disabled={loading}
              className="min-w-32 text-sm">
              {languageOptions.map(option => (
                <SelectItem key={option.value}>{option.label}</SelectItem>
              ))}
            </Select>
            <div className="flex gap-2 flex-1">
              <Button onPress={handleClearCache} disabled={loading} variant="flat" fullWidth>
                清除缓存
              </Button>
              <Button onPress={handleRefresh} disabled={loading} color="primary" fullWidth>
                刷新
              </Button>
            </div>
          </div>
        </CardBody>

        <CardBody className="py-0">
          <Divider />
        </CardBody>

        <CardBody>
          {/* 加载状态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Progress
                color="primary"
                size="sm"
                value={loadingProgress}
                aria-label="正在加载字幕..."
                className="max-w-md w-full"
              />
              <p className="text-sm text-default-400">正在加载字幕... {Math.round(loadingProgress)}%</p>
            </div>
          )}

          {/* 错误信息 */}
          {error && !loading && <Alert>{error}</Alert>}

          {/* 字幕内容 */}
          {!loading && validSubtitleItems.length > 0 && (
            <div className="flex flex-col gap-2">
              {currentPageItems.map((item: SubtitleItem, index: number) => (
                <div
                  key={index}
                  className="p-3 border-b border-default-100 last:border-b-0 hover:bg-default-50 transition-colors">
                  <div className="text-xs text-default-400 mb-1 font-mono">
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                  </div>
                  <div className="text-sm text-foreground">{item.text}</div>
                </div>
              ))}
              {!hasMore && currentPageItems.length > 0 && (
                <div className="text-center py-4 text-sm text-default-400">已加载全部字幕</div>
              )}
            </div>
          )}

          {/* 无内容状态 */}
          {!loading && validSubtitleItems.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-default-400 mb-2 text-lg">暂无字幕内容</p>
              <p className="text-sm text-default-300">请确认视频是否包含字幕，或尝试选择其他语言</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 返回顶部按钮 */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50">
            <Button
              isIconOnly
              color="primary"
              variant="shadow"
              onPress={handleBackToTop}
              className="rounded-full"
              aria-label="返回顶部">
              <IconArrowUp size={20} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default SubtitleViewer;
