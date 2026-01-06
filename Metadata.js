// Metadata Extractor for Audio Files
class MetadataExtractor {
    constructor() {
        this.supportedFormats = [
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/flac',
            'audio/aac',
            'audio/mp4',
            'audio/webm'
        ];
    }
    
    async extractFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!this.isSupportedFormat(file.type)) {
                resolve(this.getBasicMetadata(file));
                return;
            }
            
            // Use jsmediatags for ID3 and other metadata
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const metadata = this.parseTags(tag, file);
                    resolve(metadata);
                },
                onError: (error) => {
                    console.warn('Failed to extract metadata:', error);
                    resolve(this.getBasicMetadata(file));
                }
            });
        });
    }
    
    async extractFromURL(url) {
        return new Promise((resolve, reject) => {
            // For URLs, we can only get basic info unless it's a local file
            const metadata = {
                title: this.extractTitleFromURL(url),
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                duration: 0,
                bitrate: 'Unknown',
                cover: ''
            };
            
            resolve(metadata);
        });
    }
    
    parseTags(tag, file) {
        const tags = tag.tags;
        const metadata = {
            title: tags.title || this.getFileNameWithoutExtension(file.name),
            artist: tags.artist || 'Unknown Artist',
            album: tags.album || 'Unknown Album',
            year: tags.year || '',
            genre: tags.genre || '',
            track: tags.track || '',
            disc: tags.disc || '',
            composer: tags.composer || '',
            publisher: tags.publisher || '',
            duration: this.estimateDuration(file),
            bitrate: this.estimateBitrate(file),
            cover: this.extractCover(tags),
            fileSize: file.size,
            fileType: file.type,
            lastModified: file.lastModified
        };
        
        return metadata;
    }
    
    getBasicMetadata(file) {
        return {
            title: this.getFileNameWithoutExtension(file.name),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: this.estimateDuration(file),
            bitrate: this.estimateBitrate(file),
            fileSize: file.size,
            fileType: file.type,
            lastModified: file.lastModified
        };
    }
    
    extractCover(tags) {
        if (tags.picture) {
            try {
                const base64String = tags.picture.data.reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                );
                const pictureFormat = tags.picture.format;
                return `data:${pictureFormat};base64,${window.btoa(base64String)}`;
            } catch (error) {
                console.warn('Failed to extract cover art:', error);
            }
        }
        return '';
    }
    
    estimateDuration(file) {
        // Rough estimation based on file size and bitrate
        // This is not accurate but gives a rough idea
        const averageBitrate = 128; // kbps
        const sizeInBits = file.size * 8;
        const durationInSeconds = sizeInBits / (averageBitrate * 1000);
        return Math.round(durationInSeconds);
    }
    
    estimateBitrate(file) {
        // Very rough estimation
        if (file.type.includes('flac')) return 'Lossless';
        if (file.type.includes('wav')) return 'Lossless';
        if (file.type.includes('mp3')) return '128-320 kbps';
        if (file.type.includes('aac')) return '128-256 kbps';
        return 'Unknown';
    }
    
    getFileNameWithoutExtension(filename) {
        return filename.replace(/\.[^/.]+$/, "");
    }
    
    extractTitleFromURL(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return this.getFileNameWithoutExtension(filename) || 'Online Track';
        } catch {
            return 'Online Track';
        }
    }
    
    isSupportedFormat(mimeType) {
        return this.supportedFormats.includes(mimeType);
    }
    
    // Audio analysis for BPM and key detection
    async analyzeAudio(file) {
        return new Promise((resolve, reject) => {
            // This would require Web Audio API and more complex analysis
            // For now, return placeholder data
            resolve({
                bpm: Math.floor(Math.random() * 60) + 80, // Random BPM between 80-140
                key: 'C Major',
                loudness: -12,
                energy: 0.7,
                danceability: 0.6,
                tempo: 'medium'
            });
        });
    }
    
    // Extract lyrics from file if embedded
    async extractLyrics(file) {
        return new Promise((resolve, reject) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const tags = tag.tags;
                    const lyrics = tags.lyrics || tags.unsynchronisedLyrics || '';
                    resolve(lyrics);
                },
                onError: () => resolve('')
            });
        });
    }
    
    // Get audio format information
    getFormatInfo(file) {
        const mimeType = file.type;
        const extension = file.name.split('.').pop().toLowerCase();
        
        const formats = {
            'audio/mpeg': { name: 'MP3', quality: 'Lossy' },
            'audio/wav': { name: 'WAV', quality: 'Lossless' },
            'audio/flac': { name: 'FLAC', quality: 'Lossless' },
            'audio/ogg': { name: 'OGG Vorbis', quality: 'Lossy' },
            'audio/aac': { name: 'AAC', quality: 'Lossy' },
            'audio/mp4': { name: 'MP4/AAC', quality: 'Lossy' },
            'audio/webm': { name: 'WebM', quality: 'Lossy' }
        };
        
        return formats[mimeType] || { name: extension.toUpperCase(), quality: 'Unknown' };
    }
}