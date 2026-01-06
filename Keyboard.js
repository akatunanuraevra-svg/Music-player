// Keyboard Shortcuts Manager
class KeyboardShortcuts {
    constructor(app) {
        this.app = app;
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.lastKeyTime = 0;
        this.keySequence = [];
        
        this.initializeShortcuts();
    }
    
    initialize() {
        this.setupEventListeners();
        this.loadPreferences();
        this.createHelpModal();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Prevent shortcuts in input fields
        document.addEventListener('keydown', (e) => {
            if (this.isInputElement(e.target)) {
                // Allow some global shortcuts even in inputs
                const globalShortcuts = ['Escape', 'F1'];
                if (!globalShortcuts.includes(e.key)) {
                    return;
                }
            }
        }, true);
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('keyboard_shortcuts');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.isEnabled = prefs.enabled !== false;
                this.shortcuts = new Map(prefs.shortcuts || []);
            }
        } catch (error) {
            console.warn('Failed to load keyboard preferences:', error);
        }
    }
    
    savePreferences() {
        try {
            const prefs = {
                enabled: this.isEnabled,
                shortcuts: Array.from(this.shortcuts.entries())
            };
            localStorage.setItem('keyboard_shortcuts', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Failed to save keyboard preferences:', error);
        }
    }
    
    initializeShortcuts() {
        // Playback Controls
        this.registerShortcut({
            id: 'play_pause',
            key: ' ',
            description: 'Play/Pause',
            action: () => this.app.getModule('player').togglePlayPause()
        });
        
        this.registerShortcut({
            id: 'next_track',
            key: 'ArrowRight',
            description: 'Next Track',
            action: () => this.app.getModule('player').nextTrack()
        });
        
        this.registerShortcut({
            id: 'previous_track',
            key: 'ArrowLeft',
            description: 'Previous Track',
            action: () => this.app.getModule('player').previousTrack()
        });
        
        this.registerShortcut({
            id: 'forward_10s',
            key: 'Shift+ArrowRight',
            description: 'Forward 10 Seconds',
            action: () => this.app.getModule('player').seek(10)
        });
        
        this.registerShortcut({
            id: 'rewind_10s',
            key: 'Shift+ArrowLeft',
            description: 'Rewind 10 Seconds',
            action: () => this.app.getModule('player').seek(-10)
        });
        
        this.registerShortcut({
            id: 'volume_up',
            key: 'ArrowUp',
            description: 'Volume Up',
            action: () => this.adjustVolume(0.1)
        });
        
        this.registerShortcut({
            id: 'volume_down',
            key: 'ArrowDown',
            description: 'Volume Down',
            action: () => this.adjustVolume(-0.1)
        });
        
        this.registerShortcut({
            id: 'mute',
            key: 'm',
            description: 'Mute/Unmute',
            action: () => this.app.getModule('player').toggleMute()
        });
        
        // Playback Speed
        this.registerShortcut({
            id: 'speed_up',
            key: ']',
            description: 'Increase Playback Speed',
            action: () => this.adjustPlaybackRate(0.25)
        });
        
        this.registerShortcut({
            id: 'speed_down',
            key: '[',
            description: 'Decrease Playback Speed',
            action: () => this.adjustPlaybackRate(-0.25)
        });
        
        this.registerShortcut({
            id: 'speed_reset',
            key: '\\',
            description: 'Reset Playback Speed',
            action: () => this.app.getModule('player').setPlaybackRate(1)
        });
        
        // Navigation
        this.registerShortcut({
            id: 'focus_search',
            key: '/',
            description: 'Focus Search Box',
            action: () => document.getElementById('searchInput').focus()
        });
        
        this.registerShortcut({
            id: 'show_shortcuts',
            key: '?',
            description: 'Show Keyboard Shortcuts',
            action: () => this.showHelpModal()
        });
        
        this.registerShortcut({
            id: 'escape',
            key: 'Escape',
            description: 'Close Modals/Clear Search',
            action: () => this.handleEscape()
        });
        
        // Playlist Controls
        this.registerShortcut({
            id: 'toggle_shuffle',
            key: 's',
            description: 'Toggle Shuffle',
            action: () => this.app.getModule('player').toggleShuffle()
        });
        
        this.registerShortcut({
            id: 'toggle_repeat',
            key: 'r',
            description: 'Cycle Repeat Mode',
            action: () => this.app.getModule('player').toggleRepeatMode()
        });
        
        this.registerShortcut({
            id: 'toggle_favorite',
            key: 'f',
            description: 'Toggle Favorite',
            action: () => this.app.getModule('player').toggleFavorite()
        });
        
        // View Navigation
        this.registerShortcut({
            id: 'view_playlist',
            key: '1',
            description: 'Switch to Playlist View',
            action: () => this.app.switchView('playlist')
        });
        
        this.registerShortcut({
            id: 'view_albums',
            key: '2',
            description: 'Switch to Albums View',
            action: () => this.app.switchView('albums')
        });
        
        this.registerShortcut({
            id: 'view_artists',
            key: '3',
            description: 'Switch to Artists View',
            action: () => this.app.switchView('artists')
        });
        
        this.registerShortcut({
            id: 'view_favorites',
            key: '4',
            description: 'Switch to Favorites View',
            action: () => this.app.switchView('favorites')
        });
        
        // Application Controls
        this.registerShortcut({
            id: 'toggle_theme',
            key: 't',
            description: 'Toggle Theme',
            action: () => this.app.toggleTheme()
        });
        
        this.registerShortcut({
            id: 'show_equalizer',
            key: 'e',
            description: 'Show Equalizer',
            action: () => this.showEqualizer()
        });
        
        this.registerShortcut({
            id: 'upload_files',
            key: 'u',
            description: 'Upload Files',
            action: () => document.getElementById('uploadTrigger').click()
        });
        
        // Media Keys (if supported)
        this.registerMediaKeys();
    }
    
    registerShortcut(shortcut) {
        this.shortcuts.set(shortcut.id, {
            ...shortcut,
            key: this.normalizeKey(shortcut.key)
        });
    }
    
    normalizeKey(key) {
        return key.toLowerCase()
            .replace('control', 'ctrl')
            .replace('command', 'cmd')
            .replace('option', 'alt');
    }
    
    handleKeyDown(event) {
        if (!this.isEnabled || this.isInputElement(event.target)) {
            return;
        }
        
        const key = this.getKeyFromEvent(event);
        const shortcut = this.findShortcut(key);
        
        if (shortcut) {
            event.preventDefault();
            event.stopPropagation();
            
            // Execute shortcut action
            try {
                shortcut.action();
                this.showShortcutFeedback(shortcut.description);
                
                // Track analytics
                this.app.getModule('analytics').trackEvent('shortcut_used', {
                    shortcut: shortcut.id,
                    key: key
                });
            } catch (error) {
                console.error('Shortcut execution failed:', error);
            }
        }
        
        // Handle key sequences for advanced shortcuts
        this.handleKeySequence(event);
    }
    
    handleKeyUp(event) {
        // Reset key sequence after a delay
        const now = Date.now();
        if (now - this.lastKeyTime > 1000) {
            this.keySequence = [];
        }
        this.lastKeyTime = now;
    }
    
    getKeyFromEvent(event) {
        const keys = [];
        
        if (event.ctrlKey) keys.push('ctrl');
        if (event.shiftKey) keys.push('shift');
        if (event.altKey) keys.push('alt');
        if (event.metaKey) keys.push('cmd');
        
        // Add the main key
        const mainKey = event.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(mainKey)) {
            keys.push(mainKey);
        }
        
        return keys.join('+');
    }
    
    findShortcut(key) {
        for (const [id, shortcut] of this.shortcuts) {
            if (shortcut.key === key) {
                return shortcut;
            }
        }
        return null;
    }
    
    handleKeySequence(event) {
        const now = Date.now();
        
        // Reset sequence if too much time has passed
        if (now - this.lastKeyTime > 1000) {
            this.keySequence = [];
        }
        
        this.keySequence.push(event.key.toLowerCase());
        this.lastKeyTime = now;
        
        // Check for sequence shortcuts
        this.checkSequenceShortcuts();
        
        // Keep only last 5 keys
        if (this.keySequence.length > 5) {
            this.keySequence.shift();
        }
    }
    
    checkSequenceShortcuts() {
        const sequence = this.keySequence.join('');
        
        // Example sequence shortcuts
        const sequenceShortcuts = {
            'gg': () => window.scrollTo({ top: 0, behavior: 'smooth' }),
            'shift+g': () => window.scrollTo({ 
                top: document.body.scrollHeight, 
                behavior: 'smooth' 
            })
        };
        
        for (const [seq, action] of Object.entries(sequenceShortcuts)) {
            if (sequence.endsWith(seq)) {
                action();
                this.keySequence = [];
                break;
            }
        }
    }
    
    handleEscape() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.active');
        if (modals.length > 0) {
            modals.forEach(modal => modal.classList.remove('active'));
            return;
        }
        
        // Clear search
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            return;
        }
        
        // Remove focus from any focused element
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
    }
    
    adjustVolume(delta) {
        const player = this.app.getModule('player');
        const newVolume = Math.max(0, Math.min(1, player.state.volume + delta));
        player.setVolume(newVolume);
    }
    
    adjustPlaybackRate(delta) {
        const player = this.app.getModule('player');
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentRate = player.state.playbackRate;
        
        let newRate = currentRate + delta;
        
        // Find closest rate in the array
        const closest = rates.reduce((prev, curr) => {
            return Math.abs(curr - newRate) < Math.abs(prev - newRate) ? curr : prev;
        });
        
        player.setPlaybackRate(closest);
    }
    
    showEqualizer() {
        const modal = document.getElementById('equalizerModal');
        modal.classList.add('active');
    }
    
    registerMediaKeys() {
        if ('mediaSession' in navigator) {
            // Already handled in player.js
            return;
        }
        
        // Fallback for browsers without mediaSession
        try {
            // Some browsers might support these via different APIs
            if (navigator.keyboard) {
                // Handle hardware media keys if available
            }
        } catch (error) {
            console.warn('Media keys not supported:', error);
        }
    }
    
    showShortcutFeedback(description) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.innerHTML = `
            <i class="fas fa-keyboard"></i>
            <span>${description}</span>
        `;
        
        // Style it
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10000;
            font-size: 14px;
            animation: slideInRight 0.3s ease;
        `;
        
        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(feedback);
        
        // Remove after 2 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => feedback.remove(), 300);
        }, 2000);
    }
    
    createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'shortcutsHelpModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shortcuts-grid" id="shortcutsGrid"></div>
                    <div class="shortcuts-footer">
                        <label class="toggle-container">
                            <input type="checkbox" id="shortcutsEnabled" checked>
                            <span class="toggle-slider"></span>
                            <span>Enable Keyboard Shortcuts</span>
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.populateShortcutsGrid();
        this.setupHelpModalEvents();
    }
    
    populateShortcutsGrid() {
        const grid = document.getElementById('shortcutsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        // Group shortcuts by category
        const categories = {
            'Playback': ['play_pause', 'next_track', 'previous_track', 
                        'forward_10s', 'rewind_10s', 'volume_up', 
                        'volume_down', 'mute'],
            'Playback Speed': ['speed_up', 'speed_down', 'speed_reset'],
            'Navigation': ['focus_search', 'escape', 'view_playlist', 
                          'view_albums', 'view_artists', 'view_favorites'],
            'Playlist Controls': ['toggle_shuffle', 'toggle_repeat', 'toggle_favorite'],
            'Application': ['toggle_theme', 'show_equalizer', 'upload_files', 
                           'show_shortcuts']
        };
        
        for (const [category, shortcutIds] of Object.entries(categories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'shortcuts-category';
            categoryDiv.innerHTML = `<h4>${category}</h4>`;
            
            shortcutIds.forEach(shortcutId => {
                const shortcut = this.shortcuts.get(shortcutId);
                if (shortcut) {
                    const shortcutDiv = document.createElement('div');
                    shortcutDiv.className = 'shortcut-item';
                    shortcutDiv.innerHTML = `
                        <span class="shortcut-keys">
                            ${this.formatKeyDisplay(shortcut.key)}
                        </span>
                        <span class="shortcut-desc">${shortcut.description}</span>
                    `;
                    categoryDiv.appendChild(shortcutDiv);
                }
            });
            
            grid.appendChild(categoryDiv);
        }
    }
    
    formatKeyDisplay(key) {
        return key.split('+')
            .map(k => {
                switch(k) {
                    case ' ': return 'Space';
                    case 'ctrl': return 'Ctrl';
                    case 'shift': return 'Shift';
                    case 'alt': return 'Alt';
                    case 'cmd': return 'Cmd';
                    case 'arrowup': return '↑';
                    case 'arrowdown': return '↓';
                    case 'arrowleft': return '←';
                    case 'arrowright': return '→';
                    default: return k.toUpperCase();
                }
            })
            .join(' + ');
    }
    
    setupHelpModalEvents() {
        const modal = document.getElementById('shortcutsHelpModal');
        const closeBtn = modal.querySelector('.close-modal');
        const toggle = document.getElementById('shortcutsEnabled');
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        toggle.addEventListener('change', (e) => {
            this.toggleEnabled(e.target.checked);
        });
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }
    
    showHelpModal() {
        const modal = document.getElementById('shortcutsHelpModal');
        modal.classList.add('active');
        
        // Update toggle state
        const toggle = document.getElementById('shortcutsEnabled');
        if (toggle) {
            toggle.checked = this.isEnabled;
        }
    }
    
    toggleEnabled(enabled) {
        this.isEnabled = enabled;
        this.savePreferences();
        
        if (enabled) {
            this.app.announce('Keyboard shortcuts enabled');
        } else {
            this.app.announce('Keyboard shortcuts disabled');
        }
    }
    
    isInputElement(element) {
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        const editableAttributes = ['contenteditable', 'role="textbox"'];
        
        if (inputTags.includes(element.tagName)) {
            return true;
        }
        
        if (element.contentEditable === 'true') {
            return true;
        }
        
        if (element.getAttribute('role') === 'textbox') {
            return true;
        }
        
        return false;
    }
}