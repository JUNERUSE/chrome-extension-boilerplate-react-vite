// 从URL中提取视频ID
export const extractVideoId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.substring(1);
    }
    return null;
  } catch (error) {
    console.error('解析URL失败:', error);
    return null;
  }
};

// 检查是否是YouTube视频页面
export const isYoutubeVideoPage = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return (
      (urlObj.hostname.includes('youtube.com') && urlObj.pathname.includes('/watch')) ||
      urlObj.hostname.includes('youtu.be')
    );
  } catch (error) {
    console.error('解析URL失败:', error);
    return false;
  }
};
