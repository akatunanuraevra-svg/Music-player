// Main Application Initialization
class MusicPlayerApp {
    constructor() {
        this.modules = {};
        this.state = {
            theme: 'dark',
            currentView: 'playlist',
            isLoading: true,
            isOffline: !navigator.onLine,
            playbackStats: {
                totalTracksPlayed: 0,
                totalListeningTime: 0,
                favoriteTracks: []
            }
        };
        
        this.initializeApp();
    }
    
    async initializeApp() {
        try {
            // Initialize modules
            await this.initializeModules();
            
            // Load saved state
            await this.loadSavedState();
            
            // Setup event listeners
            this.setupGlobalListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Hide loading screen
            setTimeout(() => {
                document.getElementById('loadingScreen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    document.getElementById('mainContainer').style.display = 'block';
                    this.state.isLoading = false;
                    this.announce('Music player loaded successfully');
                }, 300);
            }, 1000);
            
            // Initialize analytics
            this.modules.analytics.trackEvent('app_loaded');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }
    
    async initializeModules() {
        // Initialize utility module first
        this.modules.utils = new Utils();
        
        // Initialize other modules
        this.modules.player = new MusicPlayer(this);
        this.modules.playlist = new PlaylistManager(this);
        this.modules.metadata = new MetadataExtractor();
        this.modules.visualizer = new AudioVisualizer();
        this.modules.equalizer = new Equalizer();
        this.modules.lyrics = new LyricsManager();
        this.modules.offline = new OfflineManager();
        this.modules.analytics = new AnalyticsTracker();
        this.modules.keyboard = new KeyboardShortcuts(this);
        this.modules.upload = new FileUploadHandler();
        
        // Wait for essential modules to be ready
        await Promise.all([
            this.modules.player.initialize(),
            this.modules.playlist.initialize(),
            this.modules.offline.initialize()
        ]);
    }
    
    async loadSavedState() {
        try {
            const savedState = localStorage.getItem('harmonystream_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Load theme
                if (state.theme) {
                    this.state.theme = state.theme;
                    document.documentElement.setAttribute('data-theme', state.theme);
                }
                
                // Load playback stats
                if (state.playbackStats) {
                    this.state.playbackStats = { ...this.state.playbackStats, ...state.playbackStats };
                }
                
                // Update UI elements
                this.updateStatsUI();
            }
        } catch (error) {
            console.warn('Failed to load saved state:', error);
        }
    }
    
    setupGlobalListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.modules.playlist.searchTracks(e.target.value);
        });
        
        // Online/Offline detection
        window.addEventListener('online', () => {
            this.state.isOffline = false;
            this.announce('You are back online');
            this.modules.analytics.trackEvent('online_status', { status: 'online' });
        });
        
        window.addEventListener('offline', () => {
            this.state.isOffline = true;
            this.announce('You are offline. Some features may be limited.');
            this.modules.analytics.trackEvent('online_status', { status: 'offline' });
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Service Worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }
    
    initializeUI() {
        // Update theme icon
        const themeIcon = document.getElementById('themeToggle').querySelector('i');
        themeIcon.className = this.state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        // Initialize keyboard shortcuts
        this.modules.keyboard.initialize();
        
        // Initialize search
        this.modules.playlist.initializeSearch();
        
        // Update stats display
        this.updateStatsUI();
    }
    
    toggleTheme() {
        const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.state.theme = newTheme;
        
        // Update DOM
        document.documentElement.setAttribute('data-theme', newTheme);
        
        // Update icon
        const themeIcon = document.getElementById('themeToggle').querySelector('i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        // Save to localStorage
        this.saveState();
        
        // Announce change
        this.announce(`Theme changed to ${newTheme} mode`);
        this.modules.analytics.trackEvent('theme_changed', { theme: newTheme });
    }
    
    switchView(view) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Hide all views
        document.querySelectorAll('[id$="View"]').forEach(el => {
            el.style.display = 'none';
        });
        
        // Show selected view
        const viewElement = document.getElementById(`${view}View`);
        if (viewElement) {
            viewElement.style.display = 'block';
        }
        
        this.state.currentView = view;
        
        // Load view-specific data
        switch(view) {
            case 'albums':
                this.modules.playlist.renderAlbums();
                break;
            case 'artists':
                this.modules.playlist.renderArtists();
                break;
            case 'favorites':
                this.modules.playlist.renderFavorites();
                break;
        }
        
        this.modules.analytics.trackEvent('view_switched', { view });
    }
    
    updateStatsUI() {
        const stats = this.state.playbackStats;
        
        // Update total tracks
        const totalTracks = this.modules.playlist.getTotalTracks();
        document.getElementById('totalTracks').textContent = totalTracks;
        
        // Update listening time
        const hours = Math.floor(stats.totalListeningTime / 3600);
        const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
        document.getElementById('totalTime').textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        
        // Update storage used
        this.modules.offline.getStorageUsage().then(usage => {
            document.getElementById('storageUsed').textContent = usage;
        });
    }
    
    announce(message, priority = 'polite') {
        const liveRegion = document.getElementById('liveRegion');
        liveRegion.setAttribute('aria-live', priority);
        liveRegion.textContent = message;
        
        // Clear after announcement
        setTimeout(() => {
            liveRegion.textContent = '';
        }, 3000);
    }
    
    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-toast';
        errorEl.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
            <button class="close-toast">&times;</button>
        `;
        
        document.body.appendChild(errorEl);
        
        // Add styles if not already added
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .error-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, var(--danger-color), #ff4b2b);
                    color: white;
                    padding: var(--spacing-md) var(--spacing-lg);
                    border-radius: var(--border-radius-md);
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    z-index: 10000;
                    animation: slideInRight 0.3s ease;
                    box-shadow: var(--shadow-lg);
                    max-width: 400px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .close-toast {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 1.2rem;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => errorEl.remove(), 300);
            }
        }, 5000);
        
        // Close button
        errorEl.querySelector('.close-toast').addEventListener('click', () => {
            errorEl.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => errorEl.remove(), 300);
        });
    }
    
    saveState() {
        try {
            const stateToSave = {
                theme: this.state.theme,
                playbackStats: this.state.playbackStats,
                playerState: this.modules.player.getState(),
                playlistState: this.modules.playlist.getState()
            };
            
            localStorage.setItem('harmonystream_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Failed to save state:', error);
        }
    }
    
    // Public API for modules
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    
    getState() {
        return { ...this.state };
    }
    
    updatePlaybackStats(stats) {
        this.state.playbackStats = { ...this.state.playbackStats, ...stats };
        this.updateStatsUI();
        this.saveState();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicPlayerApp();
});