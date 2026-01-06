// Playlist Manager Class
class PlaylistManager {
    constructor(app) {
        this.app = app;
        this.tracks = [];
        this.albums = new Map();
        this.artists = new Map();
        this.favorites = new Set();
        this.currentIndex = -1;
        
        this.initializeData();
    }
    
    async initialize() {
        await this.loadSavedData();
        this.setupEventListeners();
        this.renderPlaylist();
    }
    
    initializeData() {
        // Sample data for demo
        this.tracks = [
            {
                id: '1',
                title: 'Midnight City',
                artist: 'M83',
                album: 'Hurry Up, We\'re Dreaming',
                year: '2011',
                genre: 'Electronic',
                duration: 244,
                bitrate: '320kbps',
                playCount: 42,
                cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
                url: 'https://filesamples.com/samples/audio/mp3/sample3.mp3',
                source: 'online',
                addedAt: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Blinding Lights',
                artist: 'The Weeknd',
                album: 'After Hours',
                year: '2020',
                genre: 'Pop',
                duration: 202,
                bitrate: '320kbps',
                playCount: 38,
                cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400',
                url: 'https://filesamples.com/samples/audio/mp3/sample3.mp3',
                source: 'online',
                addedAt: new Date().toISOString()
            }
        ];
        
        this.updateIndexes();
    }
    
    async loadSavedData() {
        try {
            const savedData = localStorage.getItem('playlist_data');
            if (savedData) {
                const data = JSON.parse(savedData);
                
                if (data.tracks) {
                    this.tracks = data.tracks;
                }
                
                if (data.favorites) {
                    this.favorites = new Set(data.favorites);
                }
                
                if (data.currentIndex !== undefined) {
                    this.currentIndex = data.currentIndex;
                }
                
                this.updateIndexes();
            }
        } catch (error) {
            console.warn('Failed to load playlist data:', error);
        }
    }
    
    saveData() {
        try {
            const data = {
                tracks: this.tracks,
                favorites: Array.from(this.favorites),
                currentIndex: this.currentIndex
            };
            
            localStorage.setItem('playlist_data', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save playlist data:', error);
        }
    }
    
    setupEventListeners() {
        // Clear playlist button
        document.getElementById('clearPlaylist').addEventListener('click', () => this.clearPlaylist());
        
        // Save playlist button
        document.getElementById('savePlaylist').addEventListener('click', () => this.savePlaylistToFile());
        
        // Import playlist button
        document.getElementById('importPlaylist').addEventListener('click', () => this.importPlaylistFromFile());
        
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTracks(e.target.value);
        });
    }
    
    initializeSearch() {
        // Initialize Fuse.js for fuzzy search
        this.fuse = new Fuse(this.tracks, {
            keys: ['title', 'artist', 'album', 'genre'],
            threshold: 0.3,
            distance: 100,
            includeScore: true
        });
    }
    
    // Track Management
    addTrack(track, source = 'online') {
        const newTrack = {
            ...track,
            id: track.id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source,
            addedAt: new Date().toISOString(),
            playCount: track.playCount || 0
        };
        
        this.tracks.push(newTrack);
        this.updateIndexes();
        this.renderPlaylist();
        this.saveData();
        
        // Track analytics
        this.app.getModule('analytics').trackEvent('track_added', {
            trackId: newTrack.id,
            source,
            title: newTrack.title
        });
        
        return newTrack;
    }
    
    removeTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index !== -1) {
            const removed = this.tracks.splice(index, 1)[0];
            
            // Adjust current index if needed
            if (this.currentIndex >= index) {
                this.currentIndex = Math.max(-1, this.currentIndex - 1);
            }
            
            this.updateIndexes();
            this.renderPlaylist();
            this.saveData();
            
            // Track analytics
            this.app.getModule('analytics').trackEvent('track_removed', {
                trackId: removed.id,
                title: removed.title
            });
            
            return removed;
        }
        return null;
    }
    
    clearPlaylist() {
        if (this.tracks.length === 0) return;
        
        if (confirm('Are you sure you want to clear the entire playlist?')) {
            const clearedCount = this.tracks.length;
            this.tracks = [];
            this.currentIndex = -1;
            this.updateIndexes();
            this.renderPlaylist();
            this.saveData();
            
            // Track analytics
            this.app.getModule('analytics').trackEvent('playlist_cleared', {
                count: clearedCount
            });
            
            this.app.announce(`Cleared ${clearedCount} tracks from playlist`);
        }
    }
    
    updateIndexes() {
        // Update albums map
        this.albums.clear();
        this.tracks.forEach(track => {
            if (!this.albums.has(track.album)) {
                this.albums.set(track.album, {
                    title: track.album,
                    artist: track.artist,
                    year: track.year,
                    cover: track.cover,
                    tracks: []
                });
            }
            this.albums.get(track.album).tracks.push(track);
        });
        
        // Update artists map
        this.artists.clear();
        this.tracks.forEach(track => {
            if (!this.artists.has(track.artist)) {
                this.artists.set(track.artist, {
                    name: track.artist,
                    tracks: [],
                    albums: new Set()
                });
            }
            const artist = this.artists.get(track.artist);
            artist.tracks.push(track);
            artist.albums.add(track.album);
        });
    }
    
    // Playlist Navigation
    getNextTrack(shuffled = false) {
        if (this.tracks.length === 0) return null;
        
        let nextIndex;
        if (shuffled) {
            // Get random track that's not the current one
            const availableIndices = this.tracks.map((_, i) => i).filter(i => i !== this.currentIndex);
            if (availableIndices.length === 0) return null;
            nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        } else {
            nextIndex = (this.currentIndex + 1) % this.tracks.length;
        }
        
        const track = this.tracks[nextIndex];
        return { track, source: track.source, index: nextIndex };
    }
    
    getPreviousTrack() {
        if (this.tracks.length === 0 || this.currentIndex <= 0) return null;
        
        const prevIndex = this.currentIndex - 1;
        const track = this.tracks[prevIndex];
        return { track, source: track.source, index: prevIndex };
    }
    
    setCurrentTrack(index) {
        if (index >= 0 && index < this.tracks.length) {
            this.currentIndex = index;
            const track = this.tracks[index];
            
            // Increment play count
            track.playCount = (track.playCount || 0) + 1;
            
            // Update UI
            this.highlightCurrentTrack();
            this.saveData();
            
            return track;
        }
        return null;
    }
    
    // Search
    searchTracks(query) {
        if (!query.trim()) {
            this.renderPlaylist();
            return;
        }
        
        if (!this.fuse) {
            this.initializeSearch();
        }
        
        const results = this.fuse.search(query);
        this.renderSearchResults(results.map(r => r.item));
    }
    
    // Favorites
    toggleFavorite(trackId) {
        if (this.favorites.has(trackId)) {
            this.favorites.delete(trackId);
            return false;
        } else {
            this.favorites.add(trackId);
            return true;
        }
    }
    
    isFavorite(trackId) {
        return this.favorites.has(trackId);
    }
    
    getFavorites() {
        return this.tracks.filter(track => this.favorites.has(track.id));
    }
    
    // Rendering
    renderPlaylist() {
        const tbody = document.getElementById('playlistBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.tracks.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-playlist">
                    <td colspan="6">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-music" style="font-size: 3rem; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                            <p style="color: var(--text-secondary);">Your playlist is empty</p>
                            <p style="color: var(--text-tertiary); font-size: 0.9rem; margin-top: 8px;">
                                Add tracks by uploading files or streaming online
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            
            // Update playlist info
            this.updatePlaylistInfo();
            return;
        }
        
        this.tracks.forEach((track, index) => {
            const row = document.createElement('tr');
            row.className = index === this.currentIndex ? 'active' : '';
            row.dataset.trackId = track.id;
            row.dataset.index = index;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="track-title">
                        <div class="track-album-art">
                            ${track.cover ? 
                                `<img src="${track.cover}" alt="${track.album}" loading="lazy">` :
                                `<i class="fas fa-music"></i>`
                            }
                        </div>
                        <div class="track-info">
                            <div class="track-name">${this.escapeHtml(track.title)}</div>
                            <div class="track-album-name">${this.escapeHtml(track.album)}</div>
                        </div>
                    </div>
                </td>
                <td class="track-artist">${this.escapeHtml(track.artist)}</td>
                <td class="track-album">${this.escapeHtml(track.album)}</td>
                <td class="track-duration">${this.formatDuration(track.duration)}</td>
                <td class="track-actions">
                    <button class="btn-icon small favorite-btn" title="${this.favorites.has(track.id) ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="${this.favorites.has(track.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="btn-icon small remove-btn" title="Remove from playlist">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            
            // Add event listeners
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.track-actions')) {
                    this.playTrack(index);
                }
            });
            
            const favoriteBtn = row.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isFavorite = this.toggleFavorite(track.id);
                favoriteBtn.querySelector('i').className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
                favoriteBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
                favoriteBtn.style.color = isFavorite ? 'var(--danger-color)' : '';
                
                // Update favorites view if active
                if (this.app.state.currentView === 'favorites') {
                    this.renderFavorites();
                }
            });
            
            const removeBtn = row.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrack(track.id);
            });
            
            tbody.appendChild(row);
        });
        
        // Update playlist info
        this.updatePlaylistInfo();
    }
    
    renderSearchResults(tracks) {
        const tbody = document.getElementById('playlistBody');
        if (!tbody) return;
        
        if (tracks.length === 0) {
            tbody.innerHTML = `
                <tr class="no-results">
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                        No tracks found matching your search
                    </td>
                </tr>
            `;
            return;
        }
        
        this.renderPlaylist(); // Reuse playlist rendering for now
    }
    
    renderAlbums() {
        const container = document.getElementById('albumsGrid');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.albums.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-compact-disc" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                    <p>No albums found</p>
                </div>
            `;
            return;
        }
        
        this.albums.forEach((album, albumName) => {
            const albumCard = document.createElement('div');
            albumCard.className = 'album-card';
            albumCard.dataset.album = albumName;
            
            albumCard.innerHTML = `
                <div class="album-cover">
                    ${album.cover ? 
                        `<img src="${album.cover}" alt="${albumName}" loading="lazy">` :
                        `<div style="width: 100%; height: 150px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color)); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-compact-disc" style="font-size: 2rem; color: white;"></i>
                        </div>`
                    }
                </div>
                <h4>${this.escapeHtml(albumName)}</h4>
                <p>${this.escapeHtml(album.artist)}</p>
                <div class="album-year">${album.year || 'Unknown year'} • ${album.tracks.length} track${album.tracks.length !== 1 ? 's' : ''}</div>
            `;
            
            albumCard.addEventListener('click', () => {
                this.playAlbum(albumName);
            });
            
            container.appendChild(albumCard);
        });
    }
    
    renderArtists() {
        const container = document.getElementById('artistsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.artists.size === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user" style="font-size: 3rem; color: var(--text-tertiary);"></i>
                    <p>No artists found</p>
                </div>
            `;
            return;
        }
        
        this.artists.forEach((artist, artistName) => {
            const artistItem = document.createElement('div');
            artistItem.className = 'artist-item';
            artistItem.dataset.artist = artistName;
            
            const initials = artistName.split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            artistItem.innerHTML = `
                <div class="artist-avatar">${initials}</div>
                <div class="artist-info">
                    <div class="artist-name">${this.escapeHtml(artistName)}</div>
                    <div class="artist-stats">
                        <span>${artist.tracks.length} track${artist.tracks.length !== 1 ? 's' : ''}</span>
                        <span>${artist.albums.size} album${artist.albums.size !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <i class="fas fa-chevron-right" style="color: var(--text-tertiary);"></i>
            `;
            
            artistItem.addEventListener('click', () => {
                this.playArtist(artistName);
            });
            
            container.appendChild(artistItem);
        });
    }
    
    renderFavorites() {
        const container = document.getElementById('favoritesList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const favorites = this.getFavorites();
        
        if (favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-heart" style="font-size: 3rem; color: var(--danger-color); opacity: 0.3;"></i>
                    <p>No favorite tracks yet</p>
                    <p style="color: var(--text-tertiary); font-size: 0.9rem; margin-top: 8px;">
                        Click the heart icon on any track to add it to favorites
                    </p>
                </div>
            `;
            return;
        }
        
        favorites.forEach((track, index) => {
            const favoriteItem = document.createElement('div');
            favoriteItem.className = 'favorite-item';
            favoriteItem.dataset.trackId = track.id;
            
            favoriteItem.innerHTML = `
                <div class="favorite-icon">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="favorite-info">
                    <div class="favorite-track">
                        <div class="favorite-name">${this.escapeHtml(track.title)}</div>
                        <div class="favorite-artist">${this.escapeHtml(track.artist)}</div>
                    </div>
                </div>
                <div class="favorite-duration">${this.formatDuration(track.duration)}</div>
            `;
            
            favoriteItem.addEventListener('click', () => {
                const trackIndex = this.tracks.findIndex(t => t.id === track.id);
                if (trackIndex !== -1) {
                    this.playTrack(trackIndex);
                }
            });
            
            container.appendChild(favoriteItem);
        });
    }
    
    // UI Updates
    updatePlaylistInfo() {
        const totalDuration = this.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        
        document.getElementById('playlistCount').textContent = `${this.tracks.length} track${this.tracks.length !== 1 ? 's' : ''}`;
        document.getElementById('playlistDuration').textContent = this.formatDuration(totalDuration);
    }
    
    highlightCurrentTrack() {
        // Remove active class from all rows
        document.querySelectorAll('#playlistBody tr').forEach(row => {
            row.classList.remove('active');
        });
        
        // Add active class to current track
        if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
            const currentRow = document.querySelector(`#playlistBody tr[data-index="${this.currentIndex}"]`);
            if (currentRow) {
                currentRow.classList.add('active');
                
                // Scroll into view if needed
                currentRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
    
    // Playback
    playTrack(index) {
        const track = this.setCurrentTrack(index);
        if (track) {
            const player = this.app.getModule('player');
            player.loadTrack(track, track.source);
        }
    }
    
    playAlbum(albumName) {
        const album = this.albums.get(albumName);
        if (album && album.tracks.length > 0) {
            // Find first track from this album in playlist
            const trackIndex = this.tracks.findIndex(t => t.album === albumName);
            if (trackIndex !== -1) {
                this.playTrack(trackIndex);
            }
        }
    }
    
    playArtist(artistName) {
        const artist = this.artists.get(artistName);
        if (artist && artist.tracks.length > 0) {
            // Find first track from this artist in playlist
            const trackIndex = this.tracks.findIndex(t => t.artist === artistName);
            if (trackIndex !== -1) {
                this.playTrack(trackIndex);
            }
        }
    }
    
    // File Import/Export
    async savePlaylistToFile() {
        try {
            const playlistData = {
                name: 'HarmonyStream Playlist',
                version: '1.0',
                date: new Date().toISOString(),
                tracks: this.tracks.map(track => ({
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    duration: track.duration,
                    url: track.url
                }))
            };
            
            const blob = new Blob([JSON.stringify(playlistData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `harmonystream-playlist-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.app.announce('Playlist exported successfully');
            
        } catch (error) {
            console.error('Failed to save playlist:', error);
            this.app.showError('Failed to export playlist');
        }
    }
    
    async importPlaylistFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.m3u,.m3u8';
        input.multiple = false;
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const content = await file.text();
                let importedTracks = [];
                
                // Parse based on file type
                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    importedTracks = data.tracks || [];
                } else if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8')) {
                    importedTracks = this.parseM3U(content);
                }
                
                // Add imported tracks
                let addedCount = 0;
                for (const track of importedTracks) {
                    if (track.title && (track.url || track.path)) {
                        this.addTrack({
                            ...track,
                            url: track.url || track.path,
                            source: 'imported'
                        });
                        addedCount++;
                    }
                }
                
                this.app.announce(`Imported ${addedCount} tracks from ${file.name}`);
                this.app.getModule('analytics').trackEvent('playlist_imported', {
                    count: addedCount,
                    format: file.name.split('.').pop()
                });
                
            } catch (error) {
                console.error('Failed to import playlist:', error);
                this.app.showError('Failed to import playlist file');
            }
        });
        
        input.click();
    }
    
    parseM3U(content) {
        const lines = content.split('\n');
        const tracks = [];
        let currentTrack = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#EXTINF:')) {
                // Parse track info
                const match = trimmed.match(/#EXTINF:(\d+),(.+)/);
                if (match) {
                    currentTrack = {
                        duration: parseInt(match[1]),
                        title: match[2]
                    };
                }
            } else if (trimmed && !trimmed.startsWith('#')) {
                // This is a file path/URL
                currentTrack.url = trimmed;
                tracks.push({ ...currentTrack });
                currentTrack = {};
            }
        }
        
        return tracks;
    }
    
    // Utility Methods
    formatDuration(seconds) {
        if (!seconds) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTotalTracks() {
        return this.tracks.length;
    }
    
    getState() {
        return {
            tracks: this.tracks,
            currentIndex: this.currentIndex,
            favorites: Array.from(this.favorites)
        };
    }
}