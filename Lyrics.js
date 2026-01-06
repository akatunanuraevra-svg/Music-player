// Lyrics Manager with Synchronization
class LyricsManager {
    constructor() {
        this.currentLyrics = [];
        this.syncedLyrics = [];
        this.currentLine = -1;
        this.isSynced = false;
        this.lyricsSource = 'embedded'; // embedded, local, online
        this.providers = {
            genius: 'https://genius.com',
            musixmatch: 'https://musixmatch.com',
            lyricsOv: 'https://lyrics.ovh'
        };
    }
    
    async fetchLyrics(track) {
        if (!track || !track.title || !track.artist) {
            return null;
        }
        
        try {
            // Try embedded lyrics first
            if (track.lyrics) {
                this.currentLyrics = this.parseLyrics(track.lyrics);
                this.lyricsSource = 'embedded';
                return this.currentLyrics;
            }
            
            // Try local cache
            const cached = await this.getCachedLyrics(track);
            if (cached) {
                this.currentLyrics = cached;
                this.lyricsSource = 'cached';
                return cached;
            }
            
            // Fetch from online APIs
            const lyrics = await this.fetchFromOnline(track);
            if (lyrics) {
                this.currentLyrics = lyrics;
                this.lyricsSource = 'online';
                this.cacheLyrics(track, lyrics);
                return lyrics;
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to fetch lyrics:', error);
            return null;
        }
    }
    
    async fetchFromOnline(track) {
        const queries = [
            this.fetchFromLyricsOVH(track),
            this.fetchFromMusixmatch(track),
            this.fetchFromGenius(track)
        ];
        
        for (const query of queries) {
            try {
                const lyrics = await query;
                if (lyrics) {
                    return lyrics;
                }
            } catch (error) {
                continue;
            }
        }
        
        return null;
    }
    
    async fetchFromLyricsOVH(track) {
        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(track.artist)}/${encodeURIComponent(track.title)}`;
        
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.lyrics) {
            return this.parseLyrics(data.lyrics);
        }
        
        return null;
    }
    
    async fetchFromMusixmatch(track) {
        // Note: Musixmatch requires API key
        // This is a placeholder implementation
        return null;
    }
    
    async fetchFromGenius(track) {
        // Note: Genius requires API key
        // This is a placeholder implementation
        return null;
    }
    
    parseLyrics(lyricsText) {
        if (!lyricsText) return [];
        
        // Check if it's LRC format (with timestamps)
        if (lyricsText.includes('[') && lyricsText.includes(']')) {
            return this.parseLRCLyrics(lyricsText);
        }
        
        // Plain text format
        return lyricsText.split('\n').map(line => ({
            text: line.trim(),
            time: null
        }));
    }
    
    parseLRCLyrics(lrcText) {
        const lines = lrcText.split('\n');
        const lyrics = [];
        
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
        
        lines.forEach(line => {
            const matches = [...line.matchAll(timeRegex)];
            const text = line.replace(timeRegex, '').trim();
            
            if (matches.length > 0 && text) {
                matches.forEach(match => {
                    const minutes = parseInt(match[1]);
                    const seconds = parseInt(match[2]);
                    const milliseconds = parseInt(match[3].padEnd(3, '0'));
                    const time = minutes * 60 + seconds + milliseconds / 1000;
                    
                    lyrics.push({
                        text,
                        time,
                        formattedTime: match[0]
                    });
                });
            }
        });
        
        // Sort by time
        lyrics.sort((a, b) => a.time - b.time);
        
        // Mark as synced if we have timestamps
        this.isSynced = lyrics.length > 0 && lyrics[0].time !== null;
        this.syncedLyrics = this.isSynced ? [...lyrics] : [];
        
        return lyrics;
    }
    
    updateLyrics(currentTime) {
        if (!this.currentLyrics.length || !this.isSynced) return;
        
        // Find the current line based on time
        let newLine = -1;
        for (let i = 0; i < this.syncedLyrics.length; i++) {
            if (this.syncedLyrics[i].time <= currentTime) {
                newLine = i;
            } else {
                break;
            }
        }
        
        if (newLine !== this.currentLine) {
            this.currentLine = newLine;
            this.highlightCurrentLine();
        }
    }
    
    highlightCurrentLine() {
        const container = document.getElementById('lyricsContainer');
        if (!container) return;
        
        const lines = container.querySelectorAll('.lyric-line');
        lines.forEach((line, index) => {
            line.classList.toggle('active', index === this.currentLine);
            
            // Scroll to active line
            if (index === this.currentLine) {
                line.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    }
    
    displayLyrics(lyrics) {
        const container = document.getElementById('lyricsContainer');
        if (!container) return;
        
        if (!lyrics || lyrics.length === 0) {
            container.innerHTML = '<p class="no-lyrics">No lyrics available for this track</p>';
            return;
        }
        
        let html = '';
        
        if (this.isSynced) {
            // Display synced lyrics
            lyrics.forEach((line, index) => {
                const className = index === this.currentLine ? 'lyric-line active' : 'lyric-line';
                html += `<div class="${className}" data-time="${line.time || ''}">${this.escapeHtml(line.text)}</div>`;
            });
        } else {
            // Display plain text lyrics
            lyrics.forEach((line, index) => {
                html += `<div class="lyric-line">${this.escapeHtml(line.text)}</div>`;
            });
        }
        
        container.innerHTML = html;
        
        // Show lyrics section
        document.getElementById('lyricsSection').style.display = 'block';
    }
    
    async searchLyrics(track) {
        const modal = document.getElementById('lyricsSearchModal');
        modal.innerHTML = `
            <div class="modal-header">
                <h3><i class="fas fa-search"></i> Search Lyrics</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="search-form">
                    <input type="text" id="lyricsSearchInput" 
                           value="${track.artist} - ${track.title}"
                           placeholder="Search for lyrics...">
                    <button class="btn" id="searchLyricsBtn">
                        <i class="fas fa-search"></i> Search
                    </button>
                </div>
                <div class="search-results" id="lyricsSearchResults">
                    <div class="loading">Searching for lyrics...</div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Setup event listeners
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('searchLyricsBtn').addEventListener('click', () => {
            this.performLyricsSearch();
        });
        
        document.getElementById('lyricsSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performLyricsSearch();
            }
        });
        
        // Perform initial search
        await this.performLyricsSearch();
    }
    
    async performLyricsSearch() {
        const input = document.getElementById('lyricsSearchInput').value;
        const resultsContainer = document.getElementById('lyricsSearchResults');
        
        if (!input.trim()) {
            resultsContainer.innerHTML = '<div class="empty">Please enter a search query</div>';
            return;
        }
        
        resultsContainer.innerHTML = '<div class="loading">Searching for lyrics...</div>';
        
        try {
            // Parse artist and title from input
            let artist = '', title = '';
            if (input.includes('-')) {
                [artist, title] = input.split('-').map(s => s.trim());
            } else {
                title = input.trim();
            }
            
            // Search from multiple sources
            const lyrics = await this.fetchFromOnline({ artist, title });
            
            if (lyrics && lyrics.length > 0) {
                resultsContainer.innerHTML = `
                    <div class="lyrics-found">
                        <h4>Lyrics Found:</h4>
                        <div class="lyrics-preview">
                            ${lyrics.slice(0, 10).map(line => 
                                `<div class="preview-line">${this.escapeHtml(line.text)}</div>`
                            ).join('')}
                            ${lyrics.length > 10 ? '<div class="more">...</div>' : ''}
                        </div>
                        <button class="btn" id="useTheseLyrics">
                            <i class="fas fa-check"></i> Use These Lyrics
                        </button>
                    </div>
                `;
                
                document.getElementById('useTheseLyrics').addEventListener('click', () => {
                    this.currentLyrics = lyrics;
                    this.displayLyrics(lyrics);
                    document.getElementById('lyricsSearchModal').classList.remove('active');
                });
            } else {
                resultsContainer.innerHTML = '<div class="empty">No lyrics found for this track</div>';
            }
        } catch (error) {
            console.error('Lyrics search failed:', error);
            resultsContainer.innerHTML = '<div class="empty">Search failed. Please try again.</div>';
        }
    }
    
    async cacheLyrics(track, lyrics) {
        if (!track.id) return;
        
        try {
            const cacheKey = `lyrics_${track.id}`;
            const cacheData = {
                lyrics: lyrics,
                timestamp: Date.now(),
                artist: track.artist,
                title: track.title
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache lyrics:', error);
        }
    }
    
    async getCachedLyrics(track) {
        if (!track.id) return null;
        
        try {
            const cacheKey = `lyrics_${track.id}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const data = JSON.parse(cached);
                
                // Check if cache is still valid (30 days)
                const cacheAge = Date.now() - data.timestamp;
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                
                if (cacheAge < maxAge) {
                    return data.lyrics;
                }
            }
        } catch (error) {
            console.warn('Failed to retrieve cached lyrics:', error);
        }
        
        return null;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Manual synchronization tools
    enableManualSync() {
        const container = document.getElementById('lyricsContainer');
        if (!container) return;
        
        container.classList.add('sync-mode');
        container.innerHTML += `
            <div class="sync-controls">
                <button class="btn" id="startSyncBtn">
                    <i class="fas fa-play"></i> Start Sync
                </button>
                <button class="btn" id="addTimestampBtn">
                    <i class="fas fa-plus"></i> Add Timestamp
                </button>
                <button class="btn" id="saveSyncBtn">
                    <i class="fas fa-save"></i> Save Sync
                </button>
            </div>
        `;
        
        // Add sync event listeners
        // This would require more complex implementation
    }
}