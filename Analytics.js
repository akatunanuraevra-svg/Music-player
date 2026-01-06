// Analytics and User Insights Tracker
class AnalyticsTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = this.getOrCreateUserId();
        this.events = [];
        this.isTrackingEnabled = true;
        this.privacyMode = false;
        
        this.startTime = Date.now();
        this.playbackHistory = [];
        this.userPreferences = {};
        
        this.initialize();
    }
    
    initialize() {
        this.loadPreferences();
        this.setupHeartbeat();
        this.setupVisibilityTracking();
        
        // Send session start event
        this.trackEvent('session_start', {
            session_id: this.sessionId,
            user_id: this.userId,
            timestamp: new Date().toISOString()
        });
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('analytics_preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.isTrackingEnabled = prefs.isTrackingEnabled !== false;
                this.privacyMode = prefs.privacyMode || false;
                this.userPreferences = prefs.userPreferences || {};
            }
        } catch (error) {
            console.warn('Failed to load analytics preferences:', error);
        }
    }
    
    savePreferences() {
        try {
            const prefs = {
                isTrackingEnabled: this.isTrackingEnabled,
                privacyMode: this.privacyMode,
                userPreferences: this.userPreferences
            };
            localStorage.setItem('analytics_preferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Failed to save analytics preferences:', error);
        }
    }
    
    setupHeartbeat() {
        // Send heartbeat every 30 seconds to track engagement
        setInterval(() => {
            if (this.isTrackingEnabled && document.visibilityState === 'visible') {
                this.trackEvent('heartbeat', {
                    session_duration: Date.now() - this.startTime,
                    active_tab: document.visibilityState
                });
            }
        }, 30000);
    }
    
    setupVisibilityTracking() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.trackEvent('app_visible');
            } else {
                this.trackEvent('app_hidden');
            }
        });
    }
    
    trackEvent(eventName, properties = {}) {
        if (!this.isTrackingEnabled || this.privacyMode) return;
        
        const event = {
            event: eventName,
            properties: {
                ...properties,
                session_id: this.sessionId,
                user_id: this.userId,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                user_agent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screen_resolution: `${window.screen.width}x${window.screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
        
        this.events.push(event);
        
        // Store event in localStorage (batched sending)
        this.storeEvent(event);
        
        // Process specific events
        this.processEvent(eventName, properties);
        
        // Log to console in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`[Analytics] ${eventName}:`, properties);
        }
    }
    
    processEvent(eventName, properties) {
        switch (eventName) {
            case 'playback_started':
                this.recordPlaybackStart(properties);
                break;
            case 'playback_paused':
                this.recordPlaybackPause(properties);
                break;
            case 'track_completed':
                this.recordTrackCompletion(properties);
                break;
            case 'track_skipped':
                this.recordTrackSkip(properties);
                break;
            case 'volume_changed':
                this.recordVolumeChange(properties);
                break;
            case 'playback_rate_changed':
                this.recordPlaybackRateChange(properties);
                break;
        }
    }
    
    recordPlaybackStart(properties) {
        const playbackRecord = {
            trackId: properties.trackId,
            startTime: Date.now(),
            position: properties.position || 0,
            playbackRate: properties.playbackRate || 1,
            volume: properties.volume || 1
        };
        
        this.playbackHistory.push(playbackRecord);
        
        // Update user preferences based on playback patterns
        this.updateUserPreferences('playback', {
            lastPlayed: new Date().toISOString(),
            preferredVolume: playbackRecord.volume,
            preferredPlaybackRate: playbackRecord.playbackRate
        });
    }
    
    recordPlaybackPause(properties) {
        const lastPlayback = this.playbackHistory[this.playbackHistory.length - 1];
        if (lastPlayback && lastPlayback.trackId === properties.trackId) {
            lastPlayback.endTime = Date.now();
            lastPlayback.duration = lastPlayback.endTime - lastPlayback.startTime;
            lastPlayback.completed = false;
        }
    }
    
    recordTrackCompletion(properties) {
        const lastPlayback = this.playbackHistory[this.playbackHistory.length - 1];
        if (lastPlayback) {
            lastPlayback.endTime = Date.now();
            lastPlayback.duration = lastPlayback.endTime - lastPlayback.startTime;
            lastPlayback.completed = true;
            lastPlayback.trackDuration = properties.duration;
        }
    }
    
    recordTrackSkip(properties) {
        this.updateUserPreferences('skipping', {
            skipCount: (this.userPreferences.skipCount || 0) + 1,
            skipPosition: properties.position,
            skipReason: properties.reason || 'unknown'
        });
    }
    
    recordVolumeChange(properties) {
        this.updateUserPreferences('volume', {
            averageVolume: properties.volume,
            volumeChangeCount: (this.userPreferences.volumeChangeCount || 0) + 1
        });
    }
    
    recordPlaybackRateChange(properties) {
        this.updateUserPreferences('playback_rate', {
            preferredRate: properties.rate,
            rateChangeCount: (this.userPreferences.rateChangeCount || 0) + 1
        });
    }
    
    updateUserPreferences(category, data) {
        if (!this.userPreferences[category]) {
            this.userPreferences[category] = {};
        }
        
        this.userPreferences[category] = {
            ...this.userPreferences[category],
            ...data,
            updatedAt: new Date().toISOString()
        };
        
        this.savePreferences();
    }
    
    storeEvent(event) {
        try {
            // Get existing events
            const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            
            // Add new event
            storedEvents.push(event);
            
            // Keep only last 1000 events
            if (storedEvents.length > 1000) {
                storedEvents.splice(0, storedEvents.length - 1000);
            }
            
            // Save back to localStorage
            localStorage.setItem('analytics_events', JSON.stringify(storedEvents));
            
            // Send to server if online (batched)
            this.sendBatchedEvents();
            
        } catch (error) {
            console.warn('Failed to store analytics event:', error);
        }
    }
    
    async sendBatchedEvents() {
        if (!navigator.onLine || this.privacyMode) return;
        
        try {
            const storedEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
            
            if (storedEvents.length === 0) return;
            
            // In a real implementation, you would send to your analytics server
            // For now, we'll just clear after "sending"
            console.log('Sending batched analytics:', storedEvents.length, 'events');
            
            // Clear sent events
            localStorage.setItem('analytics_events', '[]');
            
        } catch (error) {
            console.warn('Failed to send analytics:', error);
        }
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getOrCreateUserId() {
        let userId = localStorage.getItem('analytics_user_id');
        
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('analytics_user_id', userId);
        }
        
        return userId;
    }
    
    // Generate user insights
    generateInsights() {
        const insights = {
            listeningHabits: this.analyzeListeningHabits(),
            favoriteGenres: this.analyzeFavoriteGenres(),
            peakHours: this.analyzePeakHours(),
            skipPatterns: this.analyzeSkipPatterns(),
            volumePreferences: this.analyzeVolumePreferences(),
            deviceUsage: this.analyzeDeviceUsage()
        };
        
        return insights;
    }
    
    analyzeListeningHabits() {
        const completedTracks = this.playbackHistory.filter(p => p.completed);
        const totalListeningTime = completedTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        
        return {
            totalTracksPlayed: completedTracks.length,
            totalListeningTime: totalListeningTime,
            averageSessionDuration: this.calculateAverageSessionDuration(),
            favoriteTimeOfDay: this.calculateFavoriteTimeOfDay()
        };
    }
    
    analyzeFavoriteGenres() {
        // This would require genre data from tracks
        return {};
    }
    
    analyzePeakHours() {
        const hours = new Array(24).fill(0);
        
        this.playbackHistory.forEach(track => {
            const hour = new Date(track.startTime).getHours();
            hours[hour]++;
        });
        
        const peakHour = hours.indexOf(Math.max(...hours));
        
        return {
            peakHour: peakHour,
            hourDistribution: hours
        };
    }
    
    analyzeSkipPatterns() {
        const skips = this.userPreferences.skipping || {};
        const skipRate = skips.skipCount ? skips.skipCount / this.playbackHistory.length : 0;
        
        return {
            skipCount: skips.skipCount || 0,
            averageSkipPosition: skips.skipPosition || 0,
            skipRate: skipRate
        };
    }
    
    analyzeVolumePreferences() {
        const volumePrefs = this.userPreferences.volume || {};
        
        return {
            averageVolume: volumePrefs.averageVolume || 0.7,
            volumeChanges: volumePrefs.volumeChangeCount || 0
        };
    }
    
    analyzeDeviceUsage() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }
    
    calculateAverageSessionDuration() {
        if (this.playbackHistory.length === 0) return 0;
        
        const durations = this.playbackHistory
            .filter(p => p.duration)
            .map(p => p.duration);
        
        if (durations.length === 0) return 0;
        
        const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
        return Math.round(average / 1000); // Convert to seconds
    }
    
    calculateFavoriteTimeOfDay() {
        const hours = new Array(24).fill(0);
        
        this.playbackHistory.forEach(track => {
            const hour = new Date(track.startTime).getHours();
            hours[hour]++;
        });
        
        const maxIndex = hours.indexOf(Math.max(...hours));
        
        if (maxIndex < 12) return 'Morning';
        if (maxIndex < 17) return 'Afternoon';
        if (maxIndex < 21) return 'Evening';
        return 'Night';
    }
    
    // Export analytics data (for user download)
    exportData() {
        const data = {
            userId: this.userId,
            sessionId: this.sessionId,
            events: this.events,
            playbackHistory: this.playbackHistory,
            userPreferences: this.userPreferences,
            insights: this.generateInsights(),
            exportDate: new Date().toISOString()
        };
        
        return JSON.stringify(data, null, 2);
    }
    
    // Reset analytics (for privacy)
    resetAnalytics() {
        this.events = [];
        this.playbackHistory = [];
        this.userPreferences = {};
        
        localStorage.removeItem('analytics_events');
        localStorage.removeItem('analytics_user_id');
        
        // Generate new IDs
        this.sessionId = this.generateSessionId();
        this.userId = this.getOrCreateUserId();
        
        this.trackEvent('analytics_reset');
    }
    
    // Toggle tracking
    toggleTracking(enabled) {
        this.isTrackingEnabled = enabled;
        this.savePreferences();
        
        if (enabled) {
            this.trackEvent('tracking_enabled');
        } else {
            this.trackEvent('tracking_disabled');
        }
    }
    
    // Set privacy mode
    setPrivacyMode(enabled) {
        this.privacyMode = enabled;
        this.savePreferences();
        
        if (enabled) {
            this.resetAnalytics();
        }
    }
}