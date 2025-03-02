// 音频缓存条目的接口
export interface AudioCacheItem {
  videoId: string;
  title: string;
  audioData: string;
  fileType: string;
  fileName: string;
  timestamp: number;
}

// 音频缓存数据库管理类
export class AudioCacheDB {
  private readonly DB_NAME = 'youtube-audio-cache-db';
  private readonly STORE_NAME = 'audio-cache';
  private readonly VERSION = 1;
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = event => {
        console.error('音频缓存数据库打开失败:', event);
        reject(new Error('无法打开音频缓存数据库'));
      };

      request.onsuccess = event => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'videoId' });
          store.createIndex('videoId', 'videoId', { unique: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // 保存音频缓存数据
  async saveAudioCache(audioCache: AudioCacheItem): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(audioCache);

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('保存音频缓存失败:', event);
        reject(new Error('无法保存音频缓存数据'));
      };
    });
  }

  // 获取音频缓存数据
  async getAudioCache(videoId: string): Promise<AudioCacheItem | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(videoId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = event => {
        console.error('获取音频缓存失败:', event);
        reject(new Error('无法获取音频缓存数据'));
      };
    });
  }

  // 清除所有音频缓存数据
  async clearAllAudioCache(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('清除音频缓存失败:', event);
        reject(new Error('无法清除音频缓存数据'));
      };
    });
  }

  // 删除特定视频的音频缓存
  async deleteAudioCache(videoId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(videoId);

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('删除音频缓存失败:', event);
        reject(new Error('无法删除音频缓存数据'));
      };
    });
  }
}

// 导出数据库实例
export const audioCacheDB = new AudioCacheDB();
