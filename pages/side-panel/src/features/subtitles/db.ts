// 字幕条目的接口
export interface SubtitleItem {
  startTime: number;
  endTime: number;
  text: string;
}

// 字幕数据的接口
export interface SubtitleData {
  videoId: string;
  title: string;
  language: string;
  items: SubtitleItem[];
  timestamp: number;
}

// 字幕数据库管理类
export class SubtitleDB {
  private readonly DB_NAME = 'youtube-subtitles-db';
  private readonly STORE_NAME = 'subtitles';
  private readonly VERSION = 1;
  private db: IDBDatabase | null = null;

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = event => {
        console.error('数据库打开失败:', event);
        reject(new Error('无法打开字幕数据库'));
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

  // 保存字幕数据
  async saveSubtitles(subtitles: SubtitleData): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(subtitles);

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('保存字幕失败:', event);
        reject(new Error('无法保存字幕数据'));
      };
    });
  }

  // 获取字幕数据
  async getSubtitles(videoId: string): Promise<SubtitleData | null> {
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
        console.error('获取字幕失败:', event);
        reject(new Error('无法获取字幕数据'));
      };
    });
  }

  // 清除所有字幕数据
  async clearAllSubtitles(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('清除字幕失败:', event);
        reject(new Error('无法清除字幕数据'));
      };
    });
  }

  // 删除特定视频的字幕
  async deleteSubtitles(videoId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(videoId);

      request.onsuccess = () => resolve();
      request.onerror = event => {
        console.error('删除字幕失败:', event);
        reject(new Error('无法删除字幕数据'));
      };
    });
  }
}

// 导出数据库实例
export const subtitleDB = new SubtitleDB();
