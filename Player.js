// Main Music Player Class
class MusicPlayer {
    constructor(app) {
        this.app = app;
        this.audio = document.getElementById('audioPlayer');
        this.wavesurfer = null;
        this.audioContext = null;
        this.analyser = null;
        
        this.state = {
            isPlaying: false,
            currentTrack: null,
            currentTime: 0,
            duration: 0,
            volume: 0.7,
            isMuted: false,
            previousVolume: 0.7,
            repeatMode: 'none', // none, one, all
            isShuffled: false,
            playbackRate: 1,
            crossfadeDuration: 2000,
            gaplessPlayback: true,
            sleepTimer: null
        };
        
        this.queue = {
            previous: [],
            upcoming: [],
            history: []
        };
        
        this.initializePlayer();
    }
    
    async initialize() {
        await this.initializeWebAudio();
        await this.initializeWaveSurfer();
        this.setupEventListeners();
        this.setupMediaSession();
        this.loadInitialState();
    }
    
    async initializeWebAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.analyser = this.audioContext.createAnalyser();
            
            // Connect nodes
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Set analyser properties
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
        } catch (error) {
            console.warn('Web Audio API not available:', error);
        }
    }
    
    async initializeWaveSurfer() {
        try {
            this.wavesurfer = WaveSurfer.create({
                container: '#waveform',
                waveColor: 'rgba(106, 17, 203, 0.3)',
                progressColor: 'rgba(37, 117, 252, 0.8)',
                cursorColor: 'transparent',
                barWidth: 3,
                barRadius: 3,
                cursorWidth: 0,
                height: 120,
                barGap: 3,
                responsive: true,
                backend: 'WebAudio',
                plugins: []
            });
            
            // Link wavesurfer with audio element
            this.wavesurfer.setVolume(this.state.volume);
            
            // Handle wavesurfer events
            this.wavesurfer.on('ready', () => {
                this.state.duration = this.wavesurfer.getDuration();
                this.updateDurationDisplay();
            });
            
            this.wavesurfer.on('audioprocess', (time) => {
                this.state.currentTime = time;
                this.updateTimeDisplay();
                this.app.getModule('lyrics').updateLyrics(time);
            });
            
            this.wavesurfer.on('finish', () => {
                this.handleTrackEnd();
            });
            
            this.wavesurfer.on('seek', (progress) => {
                if (this.audio.src) {
                    this.audio.currentTime = progress * this.audio.duration;
                }
            });
            
        } catch (error) {
            console.warn('WaveSurfer initialization failed:', error);
        }
    }
    
    setupEventListeners() {
        // Play/Pause button
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        
        // Navigation buttons
        document.getElementById('prevBtn').addEventListener('click', () => this.previousTrack());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextTrack());
        document.getElementById('rewindBtn').addEventListener('click', () => this.seek(-10));
        document.getElementById('forwardBtn').addEventListener('click', () => this.seek(10));
        
        // Repeat and shuffle
        document.getElementById('repeatBtn').addEventListener('click', () => this.toggleRepeatMode());
        document.getElementById('shuffleBtn').addEventListener('click', () => this.toggleShuffle());
        
        // Volume controls
        document.getElementById('volumeSlider').addEventListener('click', (e) => this.setVolumeFromClick(e));
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        
        // Playback rate
        document.getElementById('playbackRate').addEventListener('change', (e) => {
            this.setPlaybackRate(parseFloat(e.target.value));
        });
        
        // Progress bar
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('click', (e) => this.seekToClick(e));
        
        // Favorite button
        document.getElementById('favoriteBtn').addEventListener('click', () => this.toggleFavorite());
        
        // Vinyl toggle
        document.getElementById('vinylToggle').addEventListener('click', () => this.toggleVinylEffect());
        
        // Sleep timer
        document.getElementById('sleepTimerBtn').addEventListener('click', () => this.showSleepTimerModal());
        
        // Audio element events
        this.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
        this.audio.addEventListener('loadedmetadata', () => this.handleMetadataLoaded());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('waiting', () => this.handleBuffering());
        this.audio.addEventListener('canplay', () => this.handleCanPlay());
        
        // Keyboard shortcuts will be handled by keyboard.js
    }
    
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.play());
            navigator.mediaSession.setActionHandler('pause', () => this.pause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
            navigator.mediaSession.setActionHandler('seekbackward', (details) => this.seek(-(details.seekOffset || 10)));
            navigator.mediaSession.setActionHandler('seekforward', (details) => this.seek(details.seekOffset || 10));
            navigator.mediaSession.setActionHandler('seekto', (details) => this.seekTo(details.seekTime));
        }
    }
    
    loadInitialState() {
        // Load volume from localStorage or use default
        const savedVolume = localStorage.getItem('player_volume');
        if (savedVolume !== null) {
            this.setVolume(parseFloat(savedVolume));
        }
        
        // Load repeat mode
        const savedRepeat = localStorage.getItem('player_repeat');
        if (savedRepeat) {
            this.state.repeatMode = savedRepeat;
            this.updateRepeatButton();
        }
        
        // Load shuffle state
        const savedShuffle = localStorage.getItem('player_shuffle');
        if (savedShuffle !== null) {
            this.state.isShuffled = JSON.parse(savedShuffle);
            this.updateShuffleButton();
        }
    }
    
    async loadTrack(track, source = 'online') {
        try {
            // Stop current playback
            this.pause();
            
            // Update current track
            this.state.currentTrack = { ...track, source };
            
            // Show loading state
            this.showLoadingState();
            
            // Get audio URL based on source
            let audioUrl;
            if (source === 'online') {
                audioUrl = track.url;
            } else if (source === 'local' && track.file) {
                audioUrl = URL.createObjectURL(track.file);
            } else {
                throw new Error('Invalid track source');
            }
            
            // Load audio
            this.audio.src = audioUrl;
            
            // Load wavesurfer if available
            if (this.wavesurfer) {
                await this.wavesurfer.load(audioUrl);
            }
            
            // Update UI
            this.updatePlayerUI();
            
            // Update media session
            this.updateMediaSession();
            
            // Preload next track for gapless playback
            if (this.state.gaplessPlayback) {
                this.preloadNextTrack();
            }
            
            // Start playback
            await this.play();
            
            // Track analytics
            this.app.getModule('analytics').trackEvent('track_loaded', {
                trackId: track.id,
                source,
                title: track.title
            });
            
        } catch (error) {
            console.error('Failed to load track:', error);
            this.app.showError('Failed to load track. Please try another one.');
            this.app.announce('Failed to load track');
        }
    }
    
    async play() {
        try {
            // Resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Play audio
            await this.audio.play();
            
            // Play wavesurfer if available
            if (this.wavesurfer) {
                this.wavesurfer.play();
            }
            
            // Update state
            this.state.isPlaying = true;
            this.updatePlayButton();
            this.updateVinylEffect();
            
            // Update media session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            
            // Update status
            this.updatePlayerStatus();
            
            // Track analytics
            this.app.getModule('analytics').trackEvent('playback_started', {
                trackId: this.state.currentTrack?.id
            });
            
        } catch (error) {
            console.error('Playback failed:', error);
            this.state.isPlaying = false;
            this.updatePlayButton();
            
            // Handle autoplay restrictions
            if (error.name === 'NotAllowedError') {
                this.app.showError('Please click the play button to start playback');
            }
        }
    }
    
    pause() {
        this.audio.pause();
        
        if (this.wavesurfer) {
            this.wavesurfer.pause();
        }
        
        this.state.isPlaying = false;
        this.updatePlayButton();
        this.updateVinylEffect();
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
        
        this.updatePlayerStatus();
        
        // Track analytics
        this.app.getModule('analytics').trackEvent('playback_paused', {
            trackId: this.state.currentTrack?.id,
            position: this.audio.currentTime
        });
    }
    
    togglePlayPause() {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    previousTrack() {
        const playlist = this.app.getModule('playlist');
        const prevTrack = playlist.getPreviousTrack();
        
        if (prevTrack) {
            this.loadTrack(prevTrack.track, prevTrack.source);
            this.app.announce(`Playing previous track: ${prevTrack.track.title}`);
        }
    }
    
    nextTrack() {
        const playlist = this.app.getModule('playlist');
        const nextTrack = playlist.getNextTrack(this.state.isShuffled);
        
        if (nextTrack) {
            this.loadTrack(nextTrack.track, nextTrack.source);
            this.app.announce(`Playing next track: ${nextTrack.track.title}`);
        }
    }
    
    seek(seconds) {
        const newTime = Math.max(0, Math.min(this.audio.currentTime + seconds, this.audio.duration));
        this.audio.currentTime = newTime;
        
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(newTime / this.audio.duration);
        }
        
        this.app.announce(`Seeked ${seconds > 0 ? 'forward' : 'backward'} ${Math.abs(seconds)} seconds`);
    }
    
    seekTo(time) {
        this.audio.currentTime = time;
        
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(time / this.audio.duration);
        }
    }
    
    seekToClick(event) {
        const progressBar = event.currentTarget;
        const clickX = event.clientX - progressBar.getBoundingClientRect().left;
        const percentage = clickX / progressBar.clientWidth;
        const seekTime = percentage * this.audio.duration;
        
        this.seekTo(seekTime);
    }
    
    setVolume(volume) {
        const newVolume = Math.max(0, Math.min(1, volume));
        this.state.volume = newVolume;
        this.audio.volume = newVolume;
        
        if (this.wavesurfer) {
            this.wavesurfer.setVolume(newVolume);
        }
        
        // Update UI
        document.getElementById('volumePercent').style.width = `${newVolume * 100}%`;
        
        // Update mute button
        this.updateMuteButton();
        
        // Save to localStorage
        localStorage.setItem('player_volume', newVolume.toString());
    }
    
    setVolumeFromClick(event) {
        const slider = event.currentTarget;
        const clickX = event.clientX - slider.getBoundingClientRect().left;
        const percentage = clickX / slider.clientWidth;
        
        this.setVolume(percentage);
    }
    
    toggleMute() {
        if (this.state.isMuted) {
            // Unmute
            this.setVolume(this.state.previousVolume);
            this.state.isMuted = false;
        } else {
            // Mute
            this.state.previousVolume = this.state.volume;
            this.setVolume(0);
            this.state.isMuted = true;
        }
        
        this.updateMuteButton();
    }
    
    setPlaybackRate(rate) {
        this.state.playbackRate = rate;
        this.audio.playbackRate = rate;
        
        if (this.wavesurfer) {
            this.wavesurfer.setPlaybackRate(rate);
        }
        
        this.app.announce(`Playback speed set to ${rate}x`);
        this.app.getModule('analytics').trackEvent('playback_rate_changed', { rate });
    }
    
    toggleRepeatMode() {
        const modes = ['none', 'one', 'all'];
        const currentIndex = modes.indexOf(this.state.repeatMode);
        this.state.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        this.updateRepeatButton();
        localStorage.setItem('player_repeat', this.state.repeatMode);
        
        this.app.announce(`Repeat mode: ${this.state.repeatMode}`);
        this.app.getModule('analytics').trackEvent('repeat_mode_changed', { mode: this.state.repeatMode });
    }
    
    toggleShuffle() {
        this.state.isShuffled = !this.state.isShuffled;
        this.updateShuffleButton();
        localStorage.setItem('player_shuffle', JSON.stringify(this.state.isShuffled));
        
        const status = this.state.isShuffled ? 'enabled' : 'disabled';
        this.app.announce(`Shuffle ${status}`);
        this.app.getModule('analytics').trackEvent('shuffle_toggled', { enabled: this.state.isShuffled });
    }
    
    toggleFavorite() {
        if (!this.state.currentTrack) return;
        
        const playlist = this.app.getModule('playlist');
        const isFavorite = playlist.toggleFavorite(this.state.currentTrack.id);
        
        // Update button
        const favoriteBtn = document.getElementById('favoriteBtn');
        const icon = favoriteBtn.querySelector('i');
        icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        favoriteBtn.style.color = isFavorite ? 'var(--danger-color)' : '';
        
        this.app.announce(isFavorite ? 'Added to favorites' : 'Removed from favorites');
    }
    
    toggleVinylEffect() {
        const vinyl = document.getElementById('vinylRecord');
        const isVisible = vinyl.classList.contains('visible');
        
        if (isVisible) {
            vinyl.classList.remove('visible');
            localStorage.setItem('vinyl_effect', 'false');
        } else {
            vinyl.classList.add('visible');
            localStorage.setItem('vinyl_effect', 'true');
        }
        
        this.updateVinylEffect();
    }
    
    // Event Handlers
    handleTimeUpdate() {
        this.state.currentTime = this.audio.currentTime;
        this.updateProgressBar();
        this.updateTimeDisplay();
        
        // Update wavesurfer if available
        if (this.wavesurfer && !this.wavesurfer.isPlaying()) {
            this.wavesurfer.seekTo(this.audio.currentTime / this.audio.duration);
        }
    }
    
    handleMetadataLoaded() {
        this.state.duration = this.audio.duration;
        this.updateDurationDisplay();
    }
    
    handleTrackEnd() {
        // Track analytics
        this.app.getModule('analytics').trackEvent('track_completed', {
            trackId: this.state.currentTrack?.id,
            duration: this.state.duration
        });
        
        // Update playback stats
        this.app.updatePlaybackStats({
            totalTracksPlayed: this.app.state.playbackStats.totalTracksPlayed + 1,
            totalListeningTime: this.app.state.playbackStats.totalListeningTime + this.state.duration
        });
        
        // Handle repeat modes
        if (this.state.repeatMode === 'one') {
            this.audio.currentTime = 0;
            this.play();
        } else if (this.state.repeatMode === 'all') {
            this.nextTrack();
        } else {
            this.pause();
            this.audio.currentTime = 0;
            this.updateProgressBar();
        }
    }
    
    handleAudioError(error) {
        console.error('Audio error:', error);
        this.app.showError('Error playing audio. The file may be corrupted or unsupported.');
        
        // Try next track
        setTimeout(() => this.nextTrack(), 2000);
    }
    
    handleBuffering() {
        // Show buffering indicator
        const playBtn = document.getElementById('playPauseBtn');
        const icon = playBtn.querySelector('i');
        icon.className = 'fas fa-spinner fa-spin';
    }
    
    handleCanPlay() {
        // Hide buffering indicator
        this.updatePlayButton();
    }
    
    // UI Update Methods
    updatePlayerUI() {
        if (!this.state.currentTrack) return;
        
        const track = this.state.currentTrack;
        
        // Update track info
        document.getElementById('songTitle').textContent = track.title || 'Unknown Title';
        document.getElementById('songArtist').textContent = track.artist || 'Unknown Artist';
        document.getElementById('songAlbum').textContent = track.album || 'Unknown Album';
        
        // Update album art
        const albumArtImg = document.getElementById('albumArtImg');
        const fallbackIcon = albumArtImg.previousElementSibling;
        
        if (track.cover) {
            albumArtImg.src = track.cover;
            albumArtImg.style.display = 'block';
            fallbackIcon.style.display = 'none';
        } else {
            albumArtImg.style.display = 'none';
            fallbackIcon.style.display = 'block';
        }
        
        // Update stats
        document.getElementById('playCount').textContent = `${track.playCount || 0} plays`;
        document.getElementById('songYear').textContent = track.year || 'Unknown';
        document.getElementById('songBitrate').textContent = track.bitrate || 'Unknown';
        
        // Update favorite button
        const playlist = this.app.getModule('playlist');
        const isFavorite = playlist.isFavorite(track.id);
        const favoriteBtn = document.getElementById('favoriteBtn');
        const icon = favoriteBtn.querySelector('i');
        icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        favoriteBtn.style.color = isFavorite ? 'var(--danger-color)' : '';
        
        // Update playlist highlight
        this.app.getModule('playlist').highlightCurrentTrack();
    }
    
    updatePlayButton() {
        const playBtn = document.getElementById('playPauseBtn');
        const icon = playBtn.querySelector('i');
        
        if (this.state.isPlaying) {
            icon.className = 'fas fa-pause';
            playBtn.title = 'Pause';
        } else {
            icon.className = 'fas fa-play';
            playBtn.title = 'Play';
        }
    }
    
    updateProgressBar() {
        const progress = document.getElementById('progress');
        const handle = document.getElementById('progressHandle');
        
        if (this.audio.duration) {
            const percentage = (this.audio.currentTime / this.audio.duration) * 100;
            progress.style.width = `${percentage}%`;
            handle.style.left = `${percentage}%`;
        }
    }
    
    updateTimeDisplay() {
        document.getElementById('currentTime').textContent = this.formatTime(this.state.currentTime);
    }
    
    updateDurationDisplay() {
        document.getElementById('duration').textContent = this.formatTime(this.state.duration);
    }
    
    updateMuteButton() {
        const muteBtn = document.getElementById('muteBtn');
        const icon = muteBtn.querySelector('i');
        
        if (this.state.isMuted || this.state.volume === 0) {
            icon.className = 'fas fa-volume-mute';
            muteBtn.title = 'Unmute';
        } else if (this.state.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
            muteBtn.title = 'Mute';
        } else {
            icon.className = 'fas fa-volume-up';
            muteBtn.title = 'Mute';
        }
    }
    
    updateRepeatButton() {
        const repeatBtn = document.getElementById('repeatBtn');
        const icon = repeatBtn.querySelector('i');
        
        switch(this.state.repeatMode) {
            case 'none':
                icon.className = 'fas fa-redo';
                repeatBtn.style.color = '';
                repeatBtn.title = 'Repeat: Off';
                break;
            case 'one':
                icon.className = 'fas fa-redo';
                repeatBtn.style.color = 'var(--success-color)';
                repeatBtn.title = 'Repeat: One';
                break;
            case 'all':
                icon.className = 'fas fa-infinity';
                repeatBtn.style.color = 'var(--primary-color)';
                repeatBtn.title = 'Repeat: All';
                break;
        }
    }
    
    updateShuffleButton() {
        const shuffleBtn = document.getElementById('shuffleBtn');
        shuffleBtn.style.color = this.state.isShuffled ? 'var(--primary-color)' : '';
        shuffleBtn.title = this.state.isShuffled ? 'Shuffle: On' : 'Shuffle: Off';
    }
    
    updateVinylEffect() {
        const vinyl = document.getElementById('vinylRecord');
        if (vinyl.classList.contains('visible')) {
            if (this.state.isPlaying) {
                vinyl.classList.add('playing');
            } else {
                vinyl.classList.remove('playing');
            }
        }
    }
    
    updatePlayerStatus() {
        const statusText = document.getElementById('nowPlayingText');
        const statusIcon = document.querySelector('.status-icon i');
        
        if (this.state.isPlaying && this.state.currentTrack) {
            statusText.textContent = `Now Playing: ${this.state.currentTrack.title} - ${this.state.currentTrack.artist}`;
            statusIcon.className = 'fas fa-play';
            statusIcon.style.animation = 'pulse 2s infinite';
        } else if (this.state.currentTrack) {
            statusText.textContent = `Paused: ${this.state.currentTrack.title}`;
            statusIcon.className = 'fas fa-pause';
            statusIcon.style.animation = 'none';
        } else {
            statusText.textContent = 'Not Playing';
            statusIcon.className = 'fas fa-music';
            statusIcon.style.animation = 'none';
        }
    }
    
    updateMediaSession() {
        if ('mediaSession' in navigator && this.state.currentTrack) {
            const track = this.state.currentTrack;
            
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: track.album,
                artwork: [
                    { src: track.cover || '', sizes: '96x96', type: 'image/jpeg' },
                    { src: track.cover || '', sizes: '128x128', type: 'image/jpeg' },
                    { src: track.cover || '', sizes: '192x192', type: 'image/jpeg' },
                    { src: track.cover || '', sizes: '256x256', type: 'image/jpeg' },
                    { src: track.cover || '', sizes: '384x384', type: 'image/jpeg' },
                    { src: track.cover || '', sizes: '512x512', type: 'image/jpeg' },
                ]
            });
        }
    }
    
    // Helper Methods
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showLoadingState() {
        const playBtn = document.getElementById('playPauseBtn');
        const icon = playBtn.querySelector('i');
        icon.className = 'fas fa-spinner fa-spin';
        
        document.getElementById('songTitle').textContent = 'Loading...';
        document.getElementById('currentTime').textContent = '0:00';
        document.getElementById('duration').textContent = '0:00';
        document.getElementById('progress').style.width = '0%';
    }
    
    preloadNextTrack() {
        const playlist = this.app.getModule('playlist');
        const nextTrack = playlist.getNextTrack(this.state.isShuffled);
        
        if (nextTrack && nextTrack.track.url) {
            const preloadLink = document.createElement('link');
            preloadLink.rel = 'preload';
            preloadLink.as = 'audio';
            preloadLink.href = nextTrack.track.url;
            document.head.appendChild(preloadLink);
            
            // Remove after a while
            setTimeout(() => preloadLink.remove(), 30000);
        }
    }
    
    // Sleep Timer
    showSleepTimerModal() {
        // Implementation for sleep timer modal
        // This would create and show a modal with timer options
        console.log('Sleep timer modal would appear here');
    }
    
    // Crossfade
    async crossfadeToNextTrack() {
        const nextTrack = this.app.getModule('playlist').getNextTrack(this.state.isShuffled);
        if (!nextTrack) return;
        
        const currentAudio = this.audio;
        const nextAudio = new Audio();
        
        // Load next track
        nextAudio.src = nextTrack.track.url;
        nextAudio.volume = 0;
        
        // Start playing next track
        await nextAudio.play();
        
        // Crossfade
        const duration = this.state.crossfadeDuration;
        const steps = 20;
        const stepDuration = duration / steps;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            currentAudio.volume = this.state.volume * (1 - progress);
            nextAudio.volume = this.state.volume * progress;
            
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
        
        // Switch to next track
        this.audio = nextAudio;
        currentAudio.pause();
        currentAudio.src = '';
        
        // Update state
        this.state.currentTrack = nextTrack.track;
        this.updatePlayerUI();
    }
    
    // Public API
    getState() {
        return { ...this.state };
    }
    
    getCurrentTrack() {
        return this.state.currentTrack;
    }
    
    getAnalyser() {
        return this.analyser;
    }
    
    getAudioContext() {
        return this.audioContext;
    }
}