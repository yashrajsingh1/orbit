/**
 * ORBIT Offline Hook
 * 
 * Manages offline state and background sync.
 * Enables offline-first experience for the cognitive operating system.
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/services/offlineStorage';
import { api } from '@/services/api';

interface OfflineState {
  isOnline: boolean;
  hasPendingSync: boolean;
  pendingCount: { intents: number; tasks: number };
  isSyncing: boolean;
  lastSyncedAt: Date | null;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    hasPendingSync: false,
    pendingCount: { intents: 0, tasks: 0 },
    isSyncing: false,
    lastSyncedAt: null,
  });

  // Check pending sync on mount
  useEffect(() => {
    const checkPending = async () => {
      const pendingCount = await offlineStorage.getPendingSyncCount();
      setState(prev => ({
        ...prev,
        hasPendingSync: pendingCount.intents > 0 || pendingCount.tasks > 0,
        pendingCount,
      }));
    };

    checkPending();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      await syncPendingData();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register for background sync if available
  useEffect(() => {
    const registerSync = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        // Register sync events
        await (registration as any).sync?.register('sync-intents');
        await (registration as any).sync?.register('sync-tasks');
      }
    };

    registerSync().catch(console.error);
  }, []);

  /**
   * Sync all pending data to the server
   */
  const syncPendingData = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      console.log('[Offline] Cannot sync while offline');
      return false;
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      // Sync pending intents
      const pendingIntents = await offlineStorage.getPendingIntents();
      
      for (const intent of pendingIntents) {
        try {
          await api.post('/orbit/process', {
            text: intent.text,
            context: intent.context,
          });
          
          if (intent.id) {
            await offlineStorage.removePendingIntent(intent.id);
          }
        } catch (error) {
          console.error('[Offline] Failed to sync intent:', intent.id, error);
        }
      }

      // Sync pending tasks
      const pendingTasks = await offlineStorage.getPendingTasks();
      
      for (const task of pendingTasks) {
        try {
          await api.post(`/executor/tasks/${task.id}/${task.action}`, task.data);
          await offlineStorage.removePendingTask(task.id);
        } catch (error) {
          console.error('[Offline] Failed to sync task:', task.id, error);
        }
      }

      // Update state
      const newPendingCount = await offlineStorage.getPendingSyncCount();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        hasPendingSync: newPendingCount.intents > 0 || newPendingCount.tasks > 0,
        pendingCount: newPendingCount,
        lastSyncedAt: new Date(),
      }));

      return true;
    } catch (error) {
      console.error('[Offline] Sync failed:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
      return false;
    }
  }, []);

  /**
   * Save an intent for later sync (when offline)
   */
  const saveOfflineIntent = useCallback(async (
    text: string,
    context?: Record<string, unknown>
  ): Promise<number> => {
    const id = await offlineStorage.addPendingIntent({ text, context });
    
    const newPendingCount = await offlineStorage.getPendingSyncCount();
    setState(prev => ({
      ...prev,
      hasPendingSync: true,
      pendingCount: newPendingCount,
    }));

    return id;
  }, []);

  /**
   * Save a task action for later sync (when offline)
   */
  const saveOfflineTaskAction = useCallback(async (
    taskId: string,
    action: 'start' | 'complete' | 'abandon' | 'pause',
    data?: Record<string, unknown>
  ): Promise<void> => {
    await offlineStorage.addPendingTask({
      id: taskId,
      action,
      data,
      createdAt: new Date().toISOString(),
    });

    const newPendingCount = await offlineStorage.getPendingSyncCount();
    setState(prev => ({
      ...prev,
      hasPendingSync: true,
      pendingCount: newPendingCount,
    }));
  }, []);

  /**
   * Cache data for offline access
   */
  const cacheData = useCallback(async <T,>(
    key: string,
    data: T,
    ttlMinutes: number = 60
  ): Promise<void> => {
    await offlineStorage.setCache(key, data, ttlMinutes);
  }, []);

  /**
   * Get cached data
   */
  const getCachedData = useCallback(async <T,>(key: string): Promise<T | null> => {
    return offlineStorage.getCache<T>(key);
  }, []);

  return {
    ...state,
    syncPendingData,
    saveOfflineIntent,
    saveOfflineTaskAction,
    cacheData,
    getCachedData,
  };
}

/**
 * Component to show offline status indicator
 */
export function OfflineIndicator() {
  const { isOnline, hasPendingSync, pendingCount, isSyncing } = useOffline();

  if (isOnline && !hasPendingSync) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-full text-xs
        ${isOnline 
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
          : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }
        backdrop-blur-sm
      `}>
        <span className={`
          w-2 h-2 rounded-full
          ${isOnline ? 'bg-amber-400' : 'bg-red-400'}
          ${isSyncing ? 'animate-pulse' : ''}
        `} />
        
        {!isOnline && 'Offline'}
        {isOnline && hasPendingSync && (
          isSyncing 
            ? 'Syncing...' 
            : `${pendingCount.intents + pendingCount.tasks} pending`
        )}
      </div>
    </div>
  );
}
