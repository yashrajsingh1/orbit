/**
 * ORBIT Service Worker
 * 
 * Provides offline-first experience for the cognitive operating system.
 * Core intents and tasks remain accessible without network.
 */

const CACHE_VERSION = 'orbit-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;

// Core assets that should always be cached
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// API routes that can work offline with cached data
const OFFLINE_CAPABLE_ROUTES = [
  '/api/v1/intent/active',
  '/api/v1/planner/tasks/today',
  '/api/v1/memory/recent',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing ORBIT service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating ORBIT service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith('orbit-') && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== OFFLINE_CACHE)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network-first with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }
  
  // Default: network first
  event.respondWith(networkFirst(request));
});

// Background sync for offline intents
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-intents') {
    event.waitUntil(syncOfflineIntents());
  }
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncOfflineTasks());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data?.json() || {
    title: 'ORBIT',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png'
  };
  
  // ORBIT philosophy: only show if truly important
  if (data.priority === 'low' && Notification.permission === 'granted') {
    // Queue for later, don't interrupt
    return;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'orbit-notification',
      data: data.data,
      actions: data.actions || [],
      vibrate: data.priority === 'urgent' ? [200, 100, 200] : [],
      silent: data.priority !== 'urgent',
      requireInteraction: data.priority === 'urgent'
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Strategy: Cache First (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Strategy: Network First (default)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Strategy: Network first with offline fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page
    return caches.match('/offline.html');
  }
}

// Handle API requests with offline support
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isOfflineCapable = OFFLINE_CAPABLE_ROUTES.some(route => 
    url.pathname.includes(route)
  );
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses for offline-capable routes
    if (response.ok && isOfflineCapable) {
      const cache = await caches.open(OFFLINE_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] API request failed, checking cache:', url.pathname);
    
    // Try to return cached data
    const cached = await caches.match(request);
    if (cached) {
      // Add header to indicate offline data
      const headers = new Headers(cached.headers);
      headers.set('X-Orbit-Offline', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    
    // Return offline-friendly error
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are offline. This data will sync when connected.',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Check if path is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname);
}

// Sync offline intents when back online
async function syncOfflineIntents() {
  console.log('[SW] Syncing offline intents...');
  
  // Get pending intents from IndexedDB
  const db = await openDB();
  const tx = db.transaction('pending_intents', 'readwrite');
  const store = tx.objectStore('pending_intents');
  const intents = await store.getAll();
  
  for (const intent of intents) {
    try {
      const response = await fetch('/api/v1/orbit/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent.data)
      });
      
      if (response.ok) {
        await store.delete(intent.id);
        console.log('[SW] Synced intent:', intent.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync intent:', intent.id, error);
    }
  }
}

// Sync offline task updates
async function syncOfflineTasks() {
  console.log('[SW] Syncing offline tasks...');
  
  const db = await openDB();
  const tx = db.transaction('pending_tasks', 'readwrite');
  const store = tx.objectStore('pending_tasks');
  const tasks = await store.getAll();
  
  for (const task of tasks) {
    try {
      const response = await fetch(`/api/v1/executor/tasks/${task.id}/${task.action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task.data)
      });
      
      if (response.ok) {
        await store.delete(task.id);
        console.log('[SW] Synced task:', task.id);
      }
    } catch (error) {
      console.error('[SW] Failed to sync task:', task.id, error);
    }
  }
}

// Open IndexedDB for offline storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('orbit-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('pending_intents')) {
        db.createObjectStore('pending_intents', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pending_tasks')) {
        db.createObjectStore('pending_tasks', { keyPath: 'id' });
      }
    };
  });
}
