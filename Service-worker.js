// Service Worker for Offline Functionality
const CACHE_NAME = 'harmonystream-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/styles/player.css',
    '/styles/playlist.css',
    '/styles/responsive.css',
    '/js/app.js',
    '/js/player.js',
    '/js/playlist.js',
    '/js/utils.js',
    '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching core assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('Service Worker installed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Handle API requests differently
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        error: 'You are offline. Please check your connection.'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
        return;
    }
    
    // Handle audio file requests
    if (event.request.destination === 'audio' || 
        event.request.url.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) {
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    // Return cached audio if available
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Otherwise fetch from network
                    return fetch(event.request)
                        .then(response => {
                            // Don't cache if not successful
                            if (!response || response.status !== 200) {
                                return response;
                            }
                            
                            // Clone the response to cache it
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            
                            return response;
                        })
                        .catch(() => {
                            // Return offline placeholder for audio
                            return new Response('', {
                                status: 408,
                                statusText: 'Network error'
                            });
                        });
                })
        );
        return;
    }
    
    // For all other requests
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response to cache it
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // If offline and requesting a page, show offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // Otherwise return generic error
                        return new Response('Network error', {
                            status: 408,
                            statusText: 'You are offline'
                        });
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-playback-data') {
        event.waitUntil(syncPlaybackData());
    }
    
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

// Periodic sync for background updates
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-cache') {
        event.waitUntil(updateCache());
    }
});

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data?.text() || 'New notification from HarmonyStream',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'play',
                title: '▶️ Play',
                icon: '/icons/play.png'
            },
            {
                action: 'close',
                title: '❌ Close',
                icon: '/icons/close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('HarmonyStream', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'play') {
        // Focus or open the app and play music
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                for (const client of clientList) {
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
        );
    } else if (event.action === 'close') {
        // Notification already closed
    } else {
        // Default click action
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Background sync functions
async function syncPlaybackData() {
    try {
        const playbackData = await getStoredPlaybackData();
        
        if (playbackData.length > 0) {
            // Send to server
            const response = await fetch('/api/sync/playback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(playbackData)
            });
            
            if (response.ok) {
                // Clear synced data
                await clearPlaybackData();
                console.log('Playback data synced successfully');
            }
        }
    } catch (error) {
        console.error('Failed to sync playback data:', error);
    }
}

async function syncFavorites() {
    try {
        const favorites = await getStoredFavorites();
        
        if (favorites.length > 0) {
            const response = await fetch('/api/sync/favorites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(favorites)
            });
            
            if (response.ok) {
                await clearFavorites();
                console.log('Favorites synced successfully');
            }
        }
    } catch (error) {
        console.error('Failed to sync favorites:', error);
    }
}

async function updateCache() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const cachedRequests = await cache.keys();
        
        for (const request of cachedRequests) {
            // Skip audio files for now
            if (request.url.match(/\.(mp3|wav|ogg|flac|aac|m4a)$/i)) {
                continue;
            }
            
            try {
                const networkResponse = await fetch(request);
                if (networkResponse.ok) {
                    await cache.put(request, networkResponse);
                }
            } catch (error) {
                console.warn(`Failed to update: ${request.url}`);
            }
        }
    } catch (error) {
        console.error('Cache update failed:', error);
    }
}

// IndexedDB helpers for offline storage
async function getStoredPlaybackData() {
    // This would use IndexedDB in a real implementation
    return JSON.parse(localStorage.getItem('offline_playback_data') || '[]');
}

async function clearPlaybackData() {
    localStorage.removeItem('offline_playback_data');
}

async function getStoredFavorites() {
    return JSON.parse(localStorage.getItem('offline_favorites') || '[]');
}

async function clearFavorites() {
    localStorage.removeItem('offline_favorites');
}

// Handle messages from main thread
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_AUDIO') {
        const { url, trackId } = event.data;
        cacheAudioFile(url, trackId);
    }
});

// Cache audio file from main thread request
async function cacheAudioFile(url, trackId) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(url);
        
        if (response.ok) {
            await cache.put(new Request(`/audio/${trackId}`), response);
            
            // Notify all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'AUDIO_CACHED',
                    trackId: trackId
                });
            });
        }
    } catch (error) {
        console.error('Failed to cache audio:', error);
    }
}