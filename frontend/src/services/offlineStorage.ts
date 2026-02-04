/**
 * ORBIT Offline Storage Service
 * 
 * Provides IndexedDB storage for offline-first experience.
 * Intents and tasks can be captured offline and synced when connected.
 */

const DB_NAME = 'orbit-offline';
const DB_VERSION = 1;

interface PendingIntent {
  id?: number;
  text: string;
  context?: Record<string, unknown>;
  createdAt: string;
}

interface PendingTask {
  id: string;
  action: 'start' | 'complete' | 'abandon' | 'pause';
  data?: Record<string, unknown>;
  createdAt: string;
}

interface CachedData {
  key: string;
  data: unknown;
  cachedAt: string;
  expiresAt?: string;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private isReady = false;
  private readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.init();
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('[OfflineStorage] Database ready');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for pending intents (to be synced)
        if (!db.objectStoreNames.contains('pending_intents')) {
          const intentStore = db.createObjectStore('pending_intents', {
            keyPath: 'id',
            autoIncrement: true,
          });
          intentStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store for pending task updates (to be synced)
        if (!db.objectStoreNames.contains('pending_tasks')) {
          db.createObjectStore('pending_tasks', { keyPath: 'id' });
        }

        // Store for cached API data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Store for cognitive profile (local copy)
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
      };
    });
  }

  async ensureReady(): Promise<void> {
    if (!this.isReady) {
      await this.readyPromise;
    }
  }

  // ==================== Pending Intents ====================

  async addPendingIntent(intent: Omit<PendingIntent, 'id' | 'createdAt'>): Promise<number> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_intents', 'readwrite');
      const store = tx.objectStore('pending_intents');
      
      const record: PendingIntent = {
        ...intent,
        createdAt: new Date().toISOString(),
      };
      
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingIntents(): Promise<PendingIntent[]> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_intents', 'readonly');
      const store = tx.objectStore('pending_intents');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingIntent(id: number): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_intents', 'readwrite');
      const store = tx.objectStore('pending_intents');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingIntents(): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_intents', 'readwrite');
      const store = tx.objectStore('pending_intents');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Pending Tasks ====================

  async addPendingTask(task: PendingTask): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_tasks', 'readwrite');
      const store = tx.objectStore('pending_tasks');
      
      const record = {
        ...task,
        createdAt: new Date().toISOString(),
      };
      
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingTasks(): Promise<PendingTask[]> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_tasks', 'readonly');
      const store = tx.objectStore('pending_tasks');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingTask(id: string): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('pending_tasks', 'readwrite');
      const store = tx.objectStore('pending_tasks');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Cache ====================

  async setCache<T>(key: string, data: T, ttlMinutes: number = 60): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
      
      const record: CachedData = {
        key,
        data,
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result as CachedData | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check expiration
        if (result.expiresAt && new Date(result.expiresAt) < new Date()) {
          // Expired, delete it
          this.deleteCache(key).catch(console.error);
          resolve(null);
          return;
        }
        
        resolve(result.data as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<number> {
    await this.ensureReady();
    
    const now = new Date().toISOString();
    let deletedCount = 0;
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      
      const request = index.openCursor(range);
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Profile ====================

  async saveProfile(profile: Record<string, unknown>): Promise<void> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profile', 'readwrite');
      const store = tx.objectStore('profile');
      
      const request = store.put({ id: 'current', ...profile, savedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getProfile(): Promise<Record<string, unknown> | null> {
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('profile', 'readonly');
      const store = tx.objectStore('profile');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Sync ====================

  async hasPendingSync(): Promise<boolean> {
    const intents = await this.getPendingIntents();
    const tasks = await this.getPendingTasks();
    return intents.length > 0 || tasks.length > 0;
  }

  async getPendingSyncCount(): Promise<{ intents: number; tasks: number }> {
    const intents = await this.getPendingIntents();
    const tasks = await this.getPendingTasks();
    return { intents: intents.length, tasks: tasks.length };
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// React hook for offline status
export function useOfflineStatus(): {
  isOnline: boolean;
  hasPendingSync: boolean;
  pendingCount: { intents: number; tasks: number };
} {
  // This would use React hooks in actual implementation
  // Simplified for service file
  return {
    isOnline: navigator.onLine,
    hasPendingSync: false,
    pendingCount: { intents: 0, tasks: 0 },
  };
}
