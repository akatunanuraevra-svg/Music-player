// 10-Band Equalizer with Presets
class Equalizer {
    constructor() {
        this.frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
        this.bands = new Array(10).fill(0); // Gain values in dB
        this.presets = this.getDefaultPresets();
        this.activePreset = 'flat';
        this.isEnabled = false;
        this.audioContext = null;
        this.filters = [];
        
        this.initialize();
    }
    
    initialize() {
        this.createUI();
        this.setupEventListeners();
        this.loadSavedSettings();
    }
    
    createUI() {
        const modal = document.getElementById('equalizerModal');
        modal.innerHTML = `
            <div class="modal-header">
                <h3><i class="fas fa-sliders-h"></i> Equalizer</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="eq-status">
                    <label class="switch">
                        <input type="checkbox" id="eqEnabled">
                        <span class="slider"></span>
                    </label>
                    <span>Enable Equalizer</span>
                </div>
                
                <div class="eq-presets">
                    <h4>Presets</h4>
                    <div class="preset-grid" id="presetGrid"></div>
                </div>
                
                <div class="eq-bands">
                    <h4>Custom Equalizer</h4>
                    <div class="bands-container" id="bandsContainer"></div>
                </div>
                
                <div class="eq-controls">
                    <button class="btn" id="savePresetBtn">
                        <i class="fas fa-save"></i> Save as Preset
                    </button>
                    <button class="btn" id="resetEqBtn">
                        <i class="fas fa-undo"></i> Reset
                    </button>
                </div>
            </div>
        `;
        
        this.renderPresets();
        this.renderBands();
        this.addStyles();
    }
    
    addStyles() {
        if (!document.getElementById('equalizer-styles')) {
            const style = document.createElement('style');
            style.id = 'equalizer-styles';
            style.textContent = `
                .modal-body {
                    padding: var(--spacing-lg);
                }
                
                .eq-status {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-xl);
                    padding: var(--spacing-md);
                    background: var(--bg-tertiary);
                    border-radius: var(--border-radius-md);
                }
                
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border-color);
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
                }
                
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                
                .eq-presets {
                    margin-bottom: var(--spacing-xl);
                }
                
                .preset-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-md);
                }
                
                .preset-btn {
                    padding: var(--spacing-sm) var(--spacing-md);
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    text-align: center;
                }
                
                .preset-btn:hover {
                    background: var(--border-color);
                    color: var(--text-primary);
                }
                
                .preset-btn.active {
                    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                    color: white;
                    border-color: transparent;
                }
                
                .eq-bands {
                    margin-bottom: var(--spacing-xl);
                }
                
                .bands-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    height: 200px;
                    padding: var(--spacing-lg) var(--spacing-md);
                    background: var(--bg-tertiary);
                    border-radius: var(--border-radius-md);
                    margin-top: var(--spacing-md);
                }
                
                .band {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--spacing-sm);
                    width: 40px;
                }
                
                .band-label {
                    font-size: 0.8rem;
                    color: var(--text-tertiary);
                    writing-mode: vertical-rl;
                    transform: rotate(180deg);
                }
                
                .band-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 8px;
                    height: 120px;
                    background: linear-gradient(to top, var(--primary-color), var(--secondary-color));
                    border-radius: 4px;
                    outline: none;
                    transform: rotate(180deg);
                }
                
                .band-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .band-value {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    min-height: 20px;
                }
                
                .eq-controls {
                    display: flex;
                    gap: var(--spacing-md);
                    justify-content: center;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    renderPresets() {
        const container = document.getElementById('presetGrid');
        container.innerHTML = '';
        
        Object.keys(this.presets).forEach(presetName => {
            const btn = document.createElement('button');
            btn.className = `preset-btn ${presetName === this.activePreset ? 'active' : ''}`;
            btn.textContent = this.formatPresetName(presetName);
            btn.dataset.preset = presetName;
            btn.addEventListener('click', () => this.loadPreset(presetName));
            container.appendChild(btn);
        });
    }
    
    renderBands() {
        const container = document.getElementById('bandsContainer');
        container.innerHTML = '';
        
        this.frequencies.forEach((freq, index) => {
            const bandDiv = document.createElement('div');
            bandDiv.className = 'band';
            
            const label = this.formatFrequency(freq);
            const value = this.bands[index];
            
            bandDiv.innerHTML = `
                <div class="band-value">${value}dB</div>
                <input type="range" class="band-slider" min="-12" max="12" step="0.5" 
                       value="${value}" data-index="${index}">
                <div class="band-label">${label}</div>
            `;
            
            const slider = bandDiv.querySelector('.band-slider');
            slider.addEventListener('input', (e) => {
                this.updateBand(index, parseFloat(e.target.value));
                bandDiv.querySelector('.band-value').textContent = `${e.target.value}dB`;
            });
            
            container.appendChild(bandDiv);
        });
    }
    
    setupEventListeners() {
        // Enable/disable toggle
        document.getElementById('eqEnabled').addEventListener('change', (e) => {
            this.toggleEnabled(e.target.checked);
        });
        
        // Save preset button
        document.getElementById('savePresetBtn').addEventListener('click', () => {
            this.saveAsPreset();
        });
        
        // Reset button
        document.getElementById('resetEqBtn').addEventListener('click', () => {
            this.reset();
        });
        
        // Close modal
        document.querySelector('#equalizerModal .close-modal').addEventListener('click', () => {
            document.getElementById('equalizerModal').classList.remove('active');
        });
    }
    
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('equalizer_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.isEnabled = settings.enabled || false;
                this.bands = settings.bands || this.bands;
                this.activePreset = settings.preset || 'flat';
                
                // Update UI
                document.getElementById('eqEnabled').checked = this.isEnabled;
                this.renderBands();
                this.renderPresets();
                
                // Apply if enabled
                if (this.isEnabled) {
                    this.applyToAudio();
                }
            }
        } catch (error) {
            console.warn('Failed to load equalizer settings:', error);
        }
    }
    
    saveSettings() {
        const settings = {
            enabled: this.isEnabled,
            bands: this.bands,
            preset: this.activePreset
        };
        localStorage.setItem('equalizer_settings', JSON.stringify(settings));
    }
    
    getDefaultPresets() {
        return {
            flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            bassBoost: [6, 4, 2, 0, 0, 0, 0, -2, -3, -4],
            treble: [-4, -3, -2, 0, 2, 4, 6, 4, 2, 0],
            rock: [4, 2, 0, -1, -2, 0, 2, 3, 4, 3],
            jazz: [2, 1, 0, 1, 2, 1, 0, -1, -2, -1],
            classical: [0, 0, 0, 0, 0, 0, 0, 2, 4, 6],
            pop: [3, 2, 1, 0, -1, 0, 1, 2, 3, 2],
            dance: [6, 5, 3, 1, 0, 0, 1, 2, 3, 2],
            vocal: [-3, -2, -1, 0, 2, 3, 2, 1, 0, -1]
        };
    }
    
    loadPreset(presetName) {
        if (this.presets[presetName]) {
            this.bands = [...this.presets[presetName]];
            this.activePreset = presetName;
            this.renderBands();
            this.renderPresets();
            this.applyToAudio();
            this.saveSettings();
            
            if (window.app) {
                window.app.announce(`Equalizer preset: ${this.formatPresetName(presetName)}`);
            }
        }
    }
    
    updateBand(index, value) {
        this.bands[index] = value;
        this.activePreset = 'custom';
        this.applyBandToAudio(index, value);
        this.saveSettings();
    }
    
    toggleEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled) {
            this.applyToAudio();
        } else {
            this.removeFromAudio();
        }
        this.saveSettings();
    }
    
    async applyToAudio() {
        if (!this.isEnabled) return;
        
        const player = window.app?.getModule('player');
        if (!player) return;
        
        const audioContext = player.getAudioContext();
        if (!audioContext) return;
        
        this.audioContext = audioContext;
        
        // Get the source and destination
        const source = player.audio;
        if (!source) return;
        
        // Disconnect existing filters
        this.removeFromAudio();
        
        // Create and connect filters for each band
        this.filters = [];
        
        // Create biquad filters for each frequency band
        this.frequencies.forEach((freq, index) => {
            const filter = this.audioContext.createBiquadFilter();
            
            // Configure filter based on frequency
            if (freq < 300) {
                filter.type = 'lowshelf';
                filter.frequency.value = freq;
            } else if (freq > 8000) {
                filter.type = 'highshelf';
                filter.frequency.value = freq;
            } else {
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.0;
            }
            
            filter.gain.value = this.bands[index];
            this.filters.push(filter);
        });
        
        try {
            // Recreate the media element source
            const sourceNode = this.audioContext.createMediaElementSource(source);
            
            // Connect all filters in series
            let currentNode = sourceNode;
            this.filters.forEach(filter => {
                currentNode.connect(filter);
                currentNode = filter;
            });
            
            // Connect to destination
            currentNode.connect(this.audioContext.destination);
            
        } catch (error) {
            console.warn('Failed to apply equalizer:', error);
        }
    }
    
    applyBandToAudio(index, gain) {
        if (!this.isEnabled || !this.filters[index]) return;
        
        try {
            this.filters[index].gain.value = gain;
        } catch (error) {
            console.warn('Failed to update equalizer band:', error);
        }
    }
    
    removeFromAudio() {
        // Filters will be disconnected when audio context is reconfigured
        this.filters = [];
    }
    
    reset() {
        this.bands = new Array(10).fill(0);
        this.activePreset = 'flat';
        this.renderBands();
        this.renderPresets();
        this.applyToAudio();
        this.saveSettings();
    }
    
    saveAsPreset() {
        const presetName = prompt('Enter preset name:');
        if (presetName && presetName.trim()) {
            const name = presetName.trim().toLowerCase().replace(/\s+/g, '_');
            this.presets[name] = [...this.bands];
            this.activePreset = name;
            this.renderPresets();
            this.saveSettings();
            
            // Save custom presets to localStorage
            localStorage.setItem('equalizer_custom_presets', JSON.stringify(this.presets));
        }
    }
    
    formatFrequency(freq) {
        if (freq < 1000) {
            return `${freq} Hz`;
        } else {
            return `${(freq / 1000).toFixed(1)} kHz`;
        }
    }
    
    formatPresetName(name) {
        return name.replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
    }
}