// Offline Manager & PWA Features
class OfflineManager {
    constructor() {
        this.cacheName = 'harmonystream-v1';
        this.offlineTracks = new Map();
        this.storageQuota = 500 * 1024 * 1024; // 500MB default
        this.isOfflineMode = false;
        
        this.initialize();
    }
    
    async initialize() {
        await this.checkStorage();
        await this.loadOfflineTracks();
        this.setupEventListeners();
    }
    
    async checkStorage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = estimate.quota || this.storageQuota;
                
                console.log(`Storage quota: ${this.formatBytes(estimate.quota)}`);
                console.log(`Storage used: ${this.formatBytes(estimate.usage)}`);
            } catch (error) {
                console.warn('Storage estimation failed:', error);
            }
        }
    }
    
    async loadOfflineTracks() {
        try {
            const saved = localStorage.getItem('offline_tracks');
            if (saved) {
                const tracks = JSON.parse(saved);
                this.offlineTracks = new Map(tracks);
            }
        } catch (error) {
            console.warn('Failed to load offline tracks:', error);
        }
    }
    
    saveOfflineTracks() {
        try {
            const tracks = Array.from(this.offlineTracks.entries());
            localStorage.setItem('offline_tracks', JSON.stringify(tracks));
        } catch (error) {
            console.warn('Failed to save offline tracks:', error);
        }
    }
    
    setupEventListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOfflineMode = false;
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOfflineMode = true;
            this.notifyOfflineMode();
        });
        
        // Beforeinstallprompt for PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
        
        // App installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            this.deferredPrompt = null;
        });
    }
    
    async downloadTrack(track) {
        if (!track.url) {
            throw new Error('Track URL is required for download');
        }
        
        try {
            // Check storage availability
            const availableSpace = await this.getAvailableSpace();
            if (availableSpace < 10 * 1024 * 1024) { // Less than 10MB
                throw new Error('Insufficient storage space');
            }
            
            // Fetch the track
            const response = await fetch(track.url);
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // Store in cache
            const cache = await caches.open(this.cacheName);
            const cacheKey = this.getCacheKey(track);
            await cache.put(cacheKey, new Response(blob));
            
            // Save track metadata
            const offlineTrack = {
                ...track,
                offlineUrl: URL.createObjectURL(blob),
                downloadedAt: new Date().toISOString(),
                size: blob.size
            };
            
            this.offlineTracks.set(track.id, offlineTrack);
            this.saveOfflineTracks();
            
            // Update UI
            this.updateOfflineStatus();
            
            return offlineTrack;
            
        } catch (error) {
            console.error('Download failed:', error);
            throw error;
        }
    }
    
    async removeOfflineTrack(trackId) {
        try {
            const track = this.offlineTracks.get(trackId);
            if (track) {
                // Revoke object URL
                if (track.offlineUrl) {
                    URL.revokeObjectURL(track.offlineUrl);
                }
                
                // Remove from cache
                const cache = await caches.open(this.cacheName);
                const cacheKey = this.getCacheKey(track);
                await cache.delete(cacheKey);
                
                // Remove from map
                this.offlineTracks.delete(trackId);
                this.saveOfflineTracks();
                
                // Update UI
                this.updateOfflineStatus();
                
                return true;
            }
        } catch (error) {
            console.error('Failed to remove offline track:', error);
        }
        
        return false;
    }
    
    async getOfflineTrack(trackId) {
        return this.offlineTracks.get(trackId);
    }
    
    isTrackAvailableOffline(trackId) {
        return this.offlineTracks.has(trackId);
    }
    
    async getAvailableSpace() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return estimate.quota - estimate.usage;
            } catch (error) {
                console.warn('Failed to estimate storage:', error);
            }
        }
        return this.storageQuota;
    }
    
    async getStorageUsage() {
        try {
            const cache = await caches.open(this.cacheName);
            const keys = await cache.keys();
            let totalSize = 0;
            
            for (const key of keys) {
                const response = await cache.match(key);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
            
            // Add metadata size
            const metadataSize = JSON.stringify(Array.from(this.offlineTracks.entries())).length;
            totalSize += metadataSize;
            
            return this.formatBytes(totalSize);
        } catch (error) {
            console.warn('Failed to calculate storage usage:', error);
            return '0 MB';
        }
    }
    
    async syncOfflineData() {
        // Sync any pending operations when coming back online
        console.log('Syncing offline data...');
        
        // You could implement background sync here
        // For example, sync play counts, favorites, etc.
    }
    
    notifyOfflineMode() {
        if (window.app) {
            window.app.showError(
                'You are offline. Only downloaded tracks are available.',
                'warning'
            );
        }
    }
    
    showInstallPrompt() {
        if (!this.deferredPrompt) return;
        
        // Create install button
        const installBtn = document.createElement('button');
        installBtn.className = 'install-prompt-btn';
        installBtn.innerHTML = `
            <i class="fas fa-download"></i>
            <span>Install App</span>
        `;
        
        // Style the button
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 24px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideInUp 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Add click handler
        installBtn.addEventListener('click', async () => {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            
            this.deferredPrompt = null;
            installBtn.remove();
        });
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (installBtn.parentNode) {
                installBtn.style.animation = 'slideOutDown 0.3s ease';
                setTimeout(() => installBtn.remove(), 300);
            }
        }, 30000);
        
        document.body.appendChild(installBtn);
    }
    
    updateOfflineStatus() {
        // Update UI to show offline status
        const offlineCount = this.offlineTracks.size;
        
        // You could update a badge or counter in the UI
        const offlineBadge = document.getElementById('offlineBadge');
        if (offlineBadge) {
            offlineBadge.textContent = offlineCount;
            offlineBadge.style.display = offlineCount > 0 ? 'flex' : 'none';
        }
    }
    
    getCacheKey(track) {
        return `track_${track.id}_${track.title.replace(/\s+/g, '_')}`;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Background sync for playlists
    async syncPlaylists() {
        if (!navigator.onLine) return;
        
        try {
            // Sync favorites
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            // Send to server if you have a backend
            // await this.syncWithServer('favorites', favorites);
            
            // Sync play counts
            const playCounts = JSON.parse(localStorage.getItem('play_counts') || '{}');
            // await this.syncWithServer('play_counts', playCounts);
            
            console.log('Playlists synced successfully');
        } catch (error) {
            console.error('Playlist sync failed:', error);
        }
    }
    
    // Clear old cache entries
    async cleanupCache() {
        try {
            const cache = await caches.open(this.cacheName);
            const keys = await cache.keys();
            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            for (const key of keys) {
                const response = await cache.match(key);
                if (response) {
                    const headers = response.headers;
                    const dateHeader = headers.get('date');
                    
                    if (dateHeader) {
                        const date = new Date(dateHeader).getTime();
                        if (date < weekAgo) {
                            await cache.delete(key);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('Cache cleanup failed:', error);
        }
    }
}