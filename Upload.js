// File Upload Handler with Drag & Drop
class FileUploadHandler {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.supportedFormats = [
            'audio/mpeg', // mp3
            'audio/wav',
            'audio/ogg',
            'audio/flac',
            'audio/aac',
            'audio/mp4',
            'audio/webm',
            'audio/x-m4a'
        ];
        this.queue = [];
        this.isUploading = false;
        this.concurrentUploads = 3;
        
        this.initialize();
    }
    
    initialize() {
        this.createUploadModal();
        this.setupEventListeners();
    }
    
    createUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.innerHTML = `
            <div class="modal-header">
                <h3><i class="fas fa-cloud-upload-alt"></i> Upload Music Files</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-zone" id="uploadZone">
                    <div class="upload-icon">
                        <i class="fas fa-file-audio"></i>
                    </div>
                    <div class="upload-text">
                        <p><strong>Drag & drop your music files here</strong></p>
                        <p>or click to browse</p>
                        <p class="upload-hint">
                            Supports MP3, WAV, OGG, FLAC, AAC, M4A
                            <br>Max file size: 100MB
                        </p>
                    </div>
                    <input type="file" id="fileInput" multiple accept="${this.supportedFormats.join(',')}">
                </div>
                
                <div class="upload-queue" id="uploadQueue">
                    <h4>Upload Queue (<span id="queueCount">0</span>)</h4>
                    <div class="queue-list" id="queueList"></div>
                </div>
                
                <div class="upload-controls">
                    <button class="btn" id="startUploadBtn" disabled>
                        <i class="fas fa-upload"></i> Start Upload
                    </button>
                    <button class="btn btn-secondary" id="clearQueueBtn">
                        <i class="fas fa-trash"></i> Clear Queue
                    </button>
                </div>
            </div>
        `;
        
        this.addUploadStyles();
    }
    
    addUploadStyles() {
        if (!document.getElementById('upload-styles')) {
            const style = document.createElement('style');
            style.id = 'upload-styles';
            style.textContent = `
                .upload-zone {
                    border: 3px dashed var(--border-color);
                    border-radius: var(--border-radius-lg);
                    padding: var(--spacing-xl);
                    text-align: center;
                    cursor: pointer;
                    transition: all var(--transition-normal);
                    margin-bottom: var(--spacing-lg);
                    position: relative;
                    background: var(--bg-tertiary);
                }
                
                .upload-zone:hover {
                    border-color: var(--primary-color);
                    background: rgba(106, 17, 203, 0.05);
                }
                
                .upload-zone.dragover {
                    border-color: var(--secondary-color);
                    background: rgba(37, 117, 252, 0.1);
                    transform: scale(1.02);
                }
                
                .upload-icon {
                    font-size: 3rem;
                    color: var(--primary-color);
                    margin-bottom: var(--spacing-md);
                }
                
                .upload-text p {
                    margin: var(--spacing-xs) 0;
                    color: var(--text-secondary);
                }
                
                .upload-text p strong {
                    color: var(--text-primary);
                    font-size: 1.1rem;
                }
                
                .upload-hint {
                    font-size: 0.85rem;
                    color: var(--text-tertiary);
                    margin-top: var(--spacing-sm) !important;
                }
                
                #fileInput {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                }
                
                .upload-queue {
                    margin-bottom: var(--spacing-lg);
                }
                
                .queue-list {
                    max-height: 300px;
                    overflow-y: auto;
                    background: var(--bg-tertiary);
                    border-radius: var(--border-radius-md);
                    padding: var(--spacing-sm);
                }
                
                .queue-item {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    padding: var(--spacing-sm) var(--spacing-md);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .queue-item:last-child {
                    border-bottom: none;
                }
                
                .queue-item-icon {
                    color: var(--primary-color);
                    font-size: 1.2rem;
                }
                
                .queue-item-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .queue-item-name {
                    font-weight: 500;
                    margin-bottom: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .queue-item-details {
                    display: flex;
                    gap: var(--spacing-md);
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                
                .queue-item-status {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                }
                
                .status-pending {
                    color: var(--warning-color);
                }
                
                .status-processing {
                    color: var(--primary-color);
                }
                
                .status-completed {
                    color: var(--success-color);
                }
                
                .status-error {
                    color: var(--danger-color);
                }
                
                .progress-bar {
                    width: 100px;
                    height: 4px;
                    background: var(--border-color);
                    border-radius: 2px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                    width: 0%;
                    transition: width 0.3s ease;
                }
                
                .upload-controls {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                }
                
                .btn-secondary {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }
                
                .btn-secondary:hover {
                    background: var(--border-color);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupEventListeners() {
        const modal = document.getElementById('uploadModal');
        
        // Close modal
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Drag and drop
        const uploadZone = document.getElementById('uploadZone');
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length) {
                this.handleFiles(e.dataTransfer.files);
            }
        });
        
        // Upload controls
        document.getElementById('startUploadBtn').addEventListener('click', () => {
            this.startUpload();
        });
        
        document.getElementById('clearQueueBtn').addEventListener('click', () => {
            this.clearQueue();
        });
    }
    
    handleFiles(fileList) {
        const files = Array.from(fileList);
        let validFiles = 0;
        
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.addToQueue(file);
                validFiles++;
            }
        });
        
        if (validFiles > 0) {
            this.updateQueueDisplay();
            this.app?.announce(`Added ${validFiles} file${validFiles !== 1 ? 's' : ''} to upload queue`);
        }
        
        // Clear file input
        document.getElementById('fileInput').value = '';
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showError(`${file.name} exceeds maximum file size (100MB)`);
            return false;
        }
        
        // Check file type
        const isValidType = this.supportedFormats.some(format => {
            return file.type.startsWith('audio/') || 
                   file.type === format || 
                   file.name.toLowerCase().endsWith(format.split('/')[1]);
        });
        
        if (!isValidType) {
            this.showError(`${file.name} is not a supported audio format`);
            return false;
        }
        
        return true;
    }
    
    addToQueue(file) {
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.queue.push({
            id: fileId,
            file: file,
            status: 'pending',
            progress: 0,
            metadata: null,
            error: null
        });
        
        // Enable upload button
        document.getElementById('startUploadBtn').disabled = false;
    }
    
    updateQueueDisplay() {
        const queueList = document.getElementById('queueList');
        const queueCount = document.getElementById('queueCount');
        
        queueCount.textContent = this.queue.length;
        queueList.innerHTML = '';
        
        this.queue.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'queue-item';
            itemDiv.dataset.fileId = item.id;
            
            let statusIcon = 'fa-clock';
            let statusClass = 'status-pending';
            let progressText = '';
            
            switch(item.status) {
                case 'processing':
                    statusIcon = 'fa-spinner fa-spin';
                    statusClass = 'status-processing';
                    progressText = `${item.progress}%`;
                    break;
                case 'completed':
                    statusIcon = 'fa-check-circle';
                    statusClass = 'status-completed';
                    progressText = 'Complete';
                    break;
                case 'error':
                    statusIcon = 'fa-exclamation-circle';
                    statusClass = 'status-error';
                    progressText = item.error || 'Error';
                    break;
            }
            
            const fileSize = this.formatFileSize(item.file.size);
            
            itemDiv.innerHTML = `
                <div class="queue-item-icon">
                    <i class="fas ${statusIcon} ${statusClass}"></i>
                </div>
                <div class="queue-item-info">
                    <div class="queue-item-name" title="${item.file.name}">
                        ${this.escapeHtml(item.file.name)}
                    </div>
                    <div class="queue-item-details">
                        <span>${fileSize}</span>
                        <span>${item.file.type}</span>
                    </div>
                </div>
                <div class="queue-item-status">
                    ${item.status === 'processing' ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${item.progress}%"></div>
                        </div>
                    ` : ''}
                    <span class="${statusClass}">${progressText}</span>
                </div>
            `;
            
            queueList.appendChild(itemDiv);
        });
    }
    
    async startUpload() {
        if (this.isUploading || this.queue.length === 0) return;
        
        this.isUploading = true;
        document.getElementById('startUploadBtn').disabled = true;
        document.getElementById('startUploadBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        
        // Process files in batches
        const pendingFiles = this.queue.filter(item => item.status === 'pending');
        
        for (let i = 0; i < pendingFiles.length; i += this.concurrentUploads) {
            const batch = pendingFiles.slice(i, i + this.concurrentUploads);
            await Promise.all(batch.map(item => this.processFile(item)));
        }
        
        this.isUploading = false;
        document.getElementById('startUploadBtn').innerHTML = '<i class="fas fa-upload"></i> Start Upload';
        
        // Check if all files are processed
        const hasPending = this.queue.some(item => item.status === 'pending');
        document.getElementById('startUploadBtn').disabled = hasPending;
        
        // Notify completion
        const completedCount = this.queue.filter(item => item.status === 'completed').length;
        if (completedCount > 0) {
            this.app?.announce(`Successfully uploaded ${completedCount} file${completedCount !== 1 ? 's' : ''}`);
        }
    }
    
    async processFile(queueItem) {
        queueItem.status = 'processing';
        this.updateQueueDisplay();
        
        try {
            // Extract metadata
            const metadata = await this.extractMetadata(queueItem.file);
            queueItem.metadata = metadata;
            
            // Simulate upload progress (in real app, this would be actual upload)
            for (let progress = 0; progress <= 100; progress += 10) {
                queueItem.progress = progress;
                this.updateQueueDisplay();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Add to playlist
            const track = {
                id: queueItem.id,
                title: metadata.title,
                artist: metadata.artist,
                album: metadata.album,
                duration: metadata.duration,
                bitrate: metadata.bitrate,
                year: metadata.year,
                genre: metadata.genre,
                cover: metadata.cover,
                file: queueItem.file,
                source: 'local',
                addedAt: new Date().toISOString()
            };
            
            // Add to app playlist
            if (this.app) {
                this.app.getModule('playlist').addTrack(track, 'local');
                
                // Track analytics
                this.app.getModule('analytics').trackEvent('file_uploaded', {
                    filename: queueItem.file.name,
                    filesize: queueItem.file.size,
                    filetype: queueItem.file.type
                });
            }
            
            queueItem.status = 'completed';
            
        } catch (error) {
            console.error('File processing failed:', error);
            queueItem.status = 'error';
            queueItem.error = error.message || 'Processing failed';
        }
        
        this.updateQueueDisplay();
    }
    
    async extractMetadata(file) {
        const metadataExtractor = this.app?.getModule('metadata') || new MetadataExtractor();
        return await metadataExtractor.extractFromFile(file);
    }
    
    clearQueue() {
        if (this.queue.length === 0) return;
        
        if (confirm('Are you sure you want to clear all files from the upload queue?')) {
            this.queue = [];
            this.updateQueueDisplay();
            document.getElementById('startUploadBtn').disabled = true;
            this.app?.announce('Upload queue cleared');
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        if (this.app) {
            this.app.showError(message);
        } else {
            alert(message);
        }
    }
}