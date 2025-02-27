import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { percentToTime } from '../utils';

interface AudioContextType {
  // 状态
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isLooping: boolean;
  volume: number;
  prevVolume: number;
  showVolumeControl: boolean;
  isAudioReady: boolean;
  hasError: boolean;
  // 方法
  togglePlay: () => void;
  handleFastForward: () => void;
  handleRewind: () => void;
  toggleLoop: () => void;
  toggleMute: () => void;
  handleVolumeChange: (value: number | number[]) => void;
  toggleVolumeControl: () => void;
  handleProgress: (value: number | number[]) => void;
  restartPlay: () => void;
  // 引用值
  audioStateRef: React.MutableRefObject<{
    isUpdatingTime: boolean;
    skipSeconds: number;
  }>;
}

export const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
  src: string;
  title?: string;
  captions?: string;
  onEnded?: () => void;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children, src, captions, onEnded }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioStateRef = useRef({
    isUpdatingTime: false,
    skipSeconds: 10,
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 重置状态
    setIsPlaying(false);
    setCurrentTime(0);
    setIsAudioReady(false);
    setHasError(false);

    // 设置循环播放
    audio.loop = isLooping;

    // 设置音量
    audio.volume = volume;

    const setAudioData = () => {
      setDuration(audio.duration);
      setIsAudioReady(true);
      setHasError(false);
    };

    const handleCanPlay = () => {
      setIsAudioReady(true);
      setHasError(false);
    };

    const setAudioTime = () => {
      // 如果正在通过滑块更新时间，则跳过这个事件处理，避免状态循环更新
      if (audioStateRef.current.isUpdatingTime) return;
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) {
          onEnded();
        }
      }
    };

    const handleError = (e: ErrorEvent) => {
      console.error('音频播放错误:', e);
      setIsPlaying(false);
      setHasError(true);
      setIsAudioReady(false);

      // 尝试重新加载音频
      try {
        audio.load();
      } catch (err) {
        console.error('重新加载音频失败:', err);
      }
    };

    // 添加事件监听器
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('waiting', () => setIsAudioReady(false));
    audio.addEventListener('playing', () => {
      setIsAudioReady(true);
      setHasError(false);
    });

    // 预加载音频
    audio.load();

    // 清理函数
    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('waiting', () => setIsAudioReady(false));
      audio.removeEventListener('playing', () => {
        setIsAudioReady(true);
        setHasError(false);
      });
    };
  }, [src, onEnded, isLooping, volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('播放出错:', err);
        setHasError(true);
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isAudioReady]);

  const handleFastForward = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;

    try {
      // 检查音频元素的有效性和状态
      if (isNaN(audio.duration) || audio.duration === 0 || audio.readyState < 2) {
        console.warn('音频尚未完全加载，无法快进');
        return;
      }

      // 使用音频元素的实际duration而不是state中的值
      const actualDuration = audio.duration;
      // 确保跳转不超过音频结束前的安全边界
      const safeEndTime = Math.max(0, actualDuration - 0.5);
      const newTime = Math.min(audio.currentTime + audioStateRef.current.skipSeconds, safeEndTime);

      // 确保时间在有效范围内 - 严格检查
      if (newTime >= 0 && newTime < actualDuration && !isNaN(newTime) && isFinite(newTime)) {
        // 标记正在通过UI更新时间，避免timeupdate事件导致的循环
        audioStateRef.current.isUpdatingTime = true;

        audio.currentTime = newTime;
        setCurrentTime(newTime);

        // 清除标记
        audioStateRef.current.isUpdatingTime = false;
      }
    } catch (err) {
      console.error('快进操作出错:', err);
      setHasError(true);

      // 尝试重置音频状态
      try {
        audio.load();
      } catch (loadErr) {
        console.error('重新加载音频失败:', loadErr);
      }
    }
  }, [isAudioReady]);

  const handleRewind = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;

    try {
      const newTime = Math.max(audio.currentTime - audioStateRef.current.skipSeconds, 0);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    } catch (err) {
      console.error('快退操作出错:', err);
      setHasError(true);
    }
  }, [isAudioReady]);

  const toggleLoop = useCallback(() => {
    setIsLooping(prev => {
      const newValue = !prev;
      if (audioRef.current) {
        audioRef.current.loop = newValue;
      }
      return newValue;
    });
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume);
    }
  }, [volume, prevVolume]);

  const handleVolumeChange = useCallback((value: number | number[]) => {
    const newVolume = Number(value);
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const toggleVolumeControl = useCallback(() => {
    setShowVolumeControl(prev => !prev);
  }, []);

  const handleProgress = useCallback(
    (value: number | number[]) => {
      const audio = audioRef.current;
      if (!audio || !isAudioReady) return;

      try {
        // 值是百分比，需要转换为时间
        const newTimePercent = Number(value);
        const newTime = percentToTime(newTimePercent, duration);

        // 标记正在通过UI更新时间，避免timeupdate事件导致的循环
        audioStateRef.current.isUpdatingTime = true;

        // 确保时间在有效范围内
        if (newTime >= 0 && newTime < audio.duration) {
          audio.currentTime = newTime;
          setCurrentTime(newTime);
        }

        // 使用setTimeout来延迟清除标记，确保timeupdate事件不会干扰
        setTimeout(() => {
          audioStateRef.current.isUpdatingTime = false;
        }, 50);
      } catch (err) {
        console.error('进度条更新出错:', err);
        setHasError(true);
      }
    },
    [isAudioReady, duration],
  );

  const restartPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioReady) return;

    try {
      audio.currentTime = 0;
      setCurrentTime(0);
      audio.play().catch(err => {
        console.error('重新播放出错:', err);
        setHasError(true);
      });
      setIsPlaying(true);
    } catch (err) {
      console.error('重新开始播放出错:', err);
      setHasError(true);
    }
  }, [isAudioReady]);

  const value: AudioContextType = {
    audioRef,
    isPlaying,
    duration,
    currentTime,
    isLooping,
    volume,
    prevVolume,
    showVolumeControl,
    isAudioReady,
    hasError,
    togglePlay,
    handleFastForward,
    handleRewind,
    toggleLoop,
    toggleMute,
    handleVolumeChange,
    toggleVolumeControl,
    handleProgress,
    restartPlay,
    audioStateRef,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      <audio ref={audioRef} src={src}>
        <track kind="captions" src={captions || ''} srcLang="zh" label="中文字幕" default={!!captions} />
      </audio>
    </AudioContext.Provider>
  );
};
