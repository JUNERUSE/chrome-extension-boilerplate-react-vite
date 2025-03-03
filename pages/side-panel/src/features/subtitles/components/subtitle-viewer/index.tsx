import { Alert } from '@heroui/alert';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { Progress } from '@heroui/progress';
import { Select, SelectItem } from '@heroui/select';
import { IconArrowUp } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useState } from 'react';

import type { SubtitleData, SubtitleItem } from '../../utils/db';
import { subtitleDB } from '../../utils/db';
import type { CaptionTrack } from '../../utils/youtube-subtitles';
import {
  getAvailableSubtitleLanguages,
  getMultiLanguageSubtitles,
  getYouTubeSubtitles,
  getYouTubeVideoId,
} from '../../utils/youtube-subtitles';

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
  // 新增状态
  const [availableLanguages, setAvailableLanguages] = useState<CaptionTrack[]>([]);
  const [multiLanguageSubtitles, setMultiLanguageSubtitles] = useState<Record<string, SubtitleData | null>>({});
  const [isMultiLanguageMode, setIsMultiLanguageMode] = useState(false);
  const [secondaryLanguage, setSecondaryLanguage] = useState<string | null>(null);

  // 默认语言选项（用于备用）
  const defaultLanguageOptions = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: '英文' },
    { value: 'ja', label: '日文' },
    { value: 'ko', label: '韩文' },
    { value: 'fr', label: '法文' },
    { value: 'de', label: '德文' },
  ];

  // 获取语言显示名称
  const getLanguageLabel = (langCode: string): string => {
    const track = availableLanguages.find(lang => lang.languageCode === langCode);
    if (track && track.name && track.name.simpleText) {
      return track.name.simpleText;
    }

    const defaultLang = defaultLanguageOptions.find(lang => lang.value === langCode);
    return defaultLang ? defaultLang.label : langCode;
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      await subtitleDB.clearAllSubtitles();
      setSubtitles(null);
      setMultiLanguageSubtitles({});
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

  // 获取可用的字幕语言
  const fetchAvailableLanguages = async (videoId: string) => {
    try {
      const languages = await getAvailableSubtitleLanguages(videoId);
      console.log('获取到的可用语言:', languages);

      // 确保语言列表不为空
      if (languages && languages.length > 0) {
        // 过滤掉没有必要属性的轨道
        const validLanguages = languages.filter(lang => lang && lang.baseUrl && lang.languageCode && lang.name);

        if (validLanguages.length > 0) {
          console.log('有效的语言轨道:', validLanguages);
          setAvailableLanguages(validLanguages);

          // 如果当前选择的语言不在可用语言列表中，则选择第一个可用语言
          if (!validLanguages.some(lang => lang.languageCode === language)) {
            setLanguage(validLanguages[0].languageCode);
          }

          return validLanguages;
        }
      }

      // 如果没有获取到语言，使用默认语言选项
      console.warn('未获取到可用语言，使用默认语言选项');
      return [];
    } catch (error) {
      console.error('获取可用字幕语言失败:', error);
      return [];
    }
  };

  // 切换多语言模式
  const toggleMultiLanguageMode = () => {
    const newMode = !isMultiLanguageMode;
    setIsMultiLanguageMode(newMode);

    // 当切换到多语言模式时，如果没有选择次语言，自动选择一个
    if (
      newMode &&
      (!secondaryLanguage || !availableLanguages.some(lang => lang.languageCode === secondaryLanguage)) &&
      availableLanguages.length > 1
    ) {
      // 找到一个不同于当前语言的选项
      const otherLang = availableLanguages.find(lang => lang.languageCode !== language);
      if (otherLang) {
        console.log('自动选择次语言:', otherLang.languageCode, otherLang.name?.simpleText);
        setSecondaryLanguage(otherLang.languageCode);
        // 如果已经加载了主语言字幕，立即尝试加载次语言字幕
        if (subtitles && videoUrl) {
          const videoId = getYouTubeVideoId(videoUrl);
          if (videoId) {
            loadMultiLanguageSubtitles(videoId, language, otherLang.languageCode);
          }
        }
      } else {
        console.warn('无法找到合适的次语言');
        // 如果没有找到合适的次语言，不要切换到多语言模式
        setIsMultiLanguageMode(false);
      }
    }
  };

  // 加载多语言字幕的辅助函数
  const loadMultiLanguageSubtitles = async (videoId: string, primaryLang: string, secondaryLang: string) => {
    try {
      setLoading(true);
      // 确保次语言不是无效值
      if (secondaryLang === 'no-secondary') {
        console.warn('次语言值无效，不加载多语言字幕');
        setLoading(false);
        return;
      }

      console.log(`加载多语言字幕: 主语言=${primaryLang}, 次语言=${secondaryLang}`);
      const multiSubtitles = await getMultiLanguageSubtitles(videoId, [primaryLang, secondaryLang]);
      setMultiLanguageSubtitles(multiSubtitles);

      // 如果主语言字幕加载成功，更新显示
      if (multiSubtitles[primaryLang]) {
        setSubtitles(multiSubtitles[primaryLang]);
        // 保存到IndexedDB
        await subtitleDB.saveSubtitles(multiSubtitles[primaryLang]!);
      }

      setLoading(false);
    } catch (error) {
      console.error('加载多语言字幕失败:', error);
      setLoading(false);
    }
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
    setMultiLanguageSubtitles({});
    setAvailableLanguages([]);
    setError(null);
    setPage(1);
    setHasMore(true);
    setShowBackToTop(false);
    setIsMultiLanguageMode(false);
    setSecondaryLanguage(null);
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
        // 获取可用的字幕语言
        const languages = await fetchAvailableLanguages(videoId);

        if (languages.length === 0) {
          setError('该视频没有可用字幕');
          return;
        }

        // 首先尝试从IndexedDB获取字幕
        const cachedSubtitles = await subtitleDB.getSubtitles(videoId);

        if (cachedSubtitles && cachedSubtitles.language === language) {
          setSubtitles(cachedSubtitles);

          // 如果是多语言模式，尝试加载次语言字幕
          if (isMultiLanguageMode && secondaryLanguage && secondaryLanguage !== 'no-secondary') {
            const multiSubtitles = await getMultiLanguageSubtitles(videoId, [language, secondaryLanguage]);
            setMultiLanguageSubtitles(multiSubtitles);
          }
        } else {
          // 如果没有缓存或者语言不匹配，则从YouTube获取
          if (isMultiLanguageMode && secondaryLanguage && secondaryLanguage !== 'no-secondary') {
            // 多语言模式：获取主语言和次语言的字幕
            const multiSubtitles = await getMultiLanguageSubtitles(videoId, [language, secondaryLanguage]);
            setMultiLanguageSubtitles(multiSubtitles);

            // 设置主语言字幕用于显示
            if (multiSubtitles[language]) {
              setSubtitles(multiSubtitles[language]);
              // 保存到IndexedDB
              await subtitleDB.saveSubtitles(multiSubtitles[language]!);
            } else {
              setError(`无法获取 ${getLanguageLabel(language)} 字幕`);
            }
          } else {
            // 单语言模式：只获取主语言字幕
            const newSubtitles = await getYouTubeSubtitles(videoId, language);

            if (newSubtitles) {
              // 保存到IndexedDB
              await subtitleDB.saveSubtitles(newSubtitles);
              setSubtitles(newSubtitles);
            } else {
              setError('无法获取视频字幕，请确保视频有字幕');
            }
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
  }, [videoUrl, language, secondaryLanguage, refreshTrigger, reset, isMultiLanguageMode]);

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
              label="主语言"
              selectedKeys={[language]}
              onChange={e => setLanguage(e.target.value)}
              disabled={loading}
              className="min-w-32 text-sm">
              {availableLanguages.length > 0
                ? availableLanguages.map(lang => (
                    <SelectItem key={lang.languageCode}>{lang.name.simpleText || lang.languageCode}</SelectItem>
                  ))
                : defaultLanguageOptions.map(option => <SelectItem key={option.value}>{option.label}</SelectItem>)}
            </Select>

            {isMultiLanguageMode && (
              <Select
                label="次语言"
                selectedKeys={secondaryLanguage ? [secondaryLanguage] : []}
                onChange={e => setSecondaryLanguage(e.target.value)}
                disabled={loading || availableLanguages.length <= 1}
                className="min-w-32 text-sm">
                {availableLanguages.length > 1 ? (
                  availableLanguages
                    .filter(lang => lang.languageCode !== language)
                    .map(lang => (
                      <SelectItem key={lang.languageCode}>{lang.name.simpleText || lang.languageCode}</SelectItem>
                    ))
                ) : (
                  <SelectItem key="no-option">无可用次语言</SelectItem>
                )}
              </Select>
            )}

            <div className="flex gap-2 flex-1">
              <Button onPress={handleClearCache} disabled={loading} variant="flat" fullWidth>
                清除缓存
              </Button>
              <Button
                onPress={toggleMultiLanguageMode}
                disabled={loading || availableLanguages.length <= 1}
                color={isMultiLanguageMode ? 'primary' : 'default'}
                variant={isMultiLanguageMode ? 'solid' : 'flat'}
                fullWidth>
                {isMultiLanguageMode ? '单语言模式' : '多语言模式'}
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
              {currentPageItems.map((item: SubtitleItem, index: number) => {
                // 获取次语言对应的字幕（如果有）
                const secondaryItem =
                  isMultiLanguageMode && secondaryLanguage && multiLanguageSubtitles[secondaryLanguage]
                    ? multiLanguageSubtitles[secondaryLanguage]?.items.find(
                        secItem => secItem.startTime === item.startTime && secItem.endTime === item.endTime,
                      )
                    : null;

                return (
                  <div
                    key={index}
                    className="p-3 border-b border-default-100 last:border-b-0 hover:bg-default-50 transition-colors">
                    <div className="text-xs text-default-400 mb-1 font-mono">
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </div>
                    <div className="text-sm text-foreground">{item.text}</div>

                    {/* 显示次语言字幕（如果有） */}
                    {isMultiLanguageMode && secondaryItem && (
                      <div className="text-sm text-default-500 mt-1 pt-1 border-t border-default-100">
                        {secondaryItem.text}
                      </div>
                    )}
                  </div>
                );
              })}
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

SubtitleViewer.displayName = 'SubtitleViewer';

export default memo(SubtitleViewer);
