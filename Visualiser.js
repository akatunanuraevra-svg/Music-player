// Audio Visualizer with Web Audio API
class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('audioVisualizer');
        this.ctx = this.canvas.getContext('2d');
        this.analyser = null;
        this.dataArray = null;
        this.animationId = null;
        this.isVisualizing = false;
        this.visualizationType = 'bars'; // bars, waveform, circle, particles
        this.colors = {
            primary: '#6a11cb',
            secondary: '#2575fc',
            accent: '#00b09b'
        };
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Set canvas dimensions
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Setup visualization controls
        this.setupControls();
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }
    
    setupControls() {
        // Add visualization type selector (could be added to UI)
        // For now, we'll cycle through types on click
        this.canvas.addEventListener('click', () => {
            this.cycleVisualizationType();
        });
    }
    
    connectToPlayer(player) {
        this.analyser = player.getAnalyser();
        if (this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.startVisualization();
        }
    }
    
    disconnect() {
        this.stopVisualization();
        this.analyser = null;
        this.dataArray = null;
    }
    
    startVisualization() {
        if (!this.analyser || this.isVisualizing) return;
        
        this.isVisualizing = true;
        this.draw();
    }
    
    stopVisualization() {
        this.isVisualizing = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.clearCanvas();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    draw() {
        if (!this.isVisualizing || !this.analyser) return;
        
        this.animationId = requestAnimationFrame(() => this.draw());
        
        switch (this.visualizationType) {
            case 'bars':
                this.drawBars();
                break;
            case 'waveform':
                this.drawWaveform();
                break;
            case 'circle':
                this.drawCircle();
                break;
            case 'particles':
                this.drawParticles();
                break;
        }
    }
    
    drawBars() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        // Clear with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(26, 26, 46, 0.1)');
        gradient.addColorStop(1, 'rgba(106, 17, 203, 0.05)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = this.dataArray[i] / 2;
            
            // Create gradient for each bar
            const barGradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, this.canvas.height - barHeight);
            barGradient.addColorStop(0, this.colors.primary);
            barGradient.addColorStop(1, this.colors.secondary);
            
            this.ctx.fillStyle = barGradient;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    drawWaveform() {
        this.analyser.getByteTimeDomainData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colors.primary;
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width * 1.0 / this.dataArray.length;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
        
        // Add glow effect
        this.ctx.shadowColor = this.colors.secondary;
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    drawCircle() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Draw background circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(106, 17, 203, 0.1)';
        this.ctx.fill();
        
        // Draw frequency bars in circle
        const barCount = 128;
        const angleStep = (2 * Math.PI) / barCount;
        
        for (let i = 0; i < barCount; i++) {
            const value = this.dataArray[Math.floor(i * this.dataArray.length / barCount)];
            const barLength = (value / 255) * radius * 0.5;
            const angle = i * angleStep;
            
            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barLength);
            const y2 = centerY + Math.sin(angle) * (radius + barLength);
            
            // Create gradient for each bar
            const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, this.colors.primary);
            gradient.addColorStop(1, this.colors.secondary);
            
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
        
        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.2, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'rgba(37, 117, 252, 0.3)';
        this.ctx.fill();
    }
    
    drawParticles() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const particleCount = 100;
        const particles = [];
        
        // Create particles based on frequency data
        for (let i = 0; i < particleCount; i++) {
            const freqIndex = Math.floor(i * this.dataArray.length / particleCount);
            const energy = this.dataArray[freqIndex] / 255;
            
            particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 2 + energy * 8,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2,
                color: this.getColorFromEnergy(energy),
                energy: energy
            });
        }
        
        // Update and draw particles
        particles.forEach(particle => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            
            // Bounce off walls
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.speedX *= -1;
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.speedY *= -1;
            }
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
            
            // Add glow
            this.ctx.shadowColor = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }
    
    getColorFromEnergy(energy) {
        // Interpolate between colors based on energy
        const r = Math.floor(106 + (37 - 106) * energy);
        const g = Math.floor(17 + (117 - 17) * energy);
        const b = Math.floor(203 + (252 - 203) * energy);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    cycleVisualizationType() {
        const types = ['bars', 'waveform', 'circle', 'particles'];
        const currentIndex = types.indexOf(this.visualizationType);
        this.visualizationType = types[(currentIndex + 1) % types.length];
        
        // Announce change
        if (window.app) {
            window.app.announce(`Visualization: ${this.visualizationType}`);
        }
    }
    
    setVisualizationType(type) {
        const validTypes = ['bars', 'waveform', 'circle', 'particles'];
        if (validTypes.includes(type)) {
            this.visualizationType = type;
        }
    }
    
    // Audio analysis for more advanced visualizations
    analyzeAudioData() {
        if (!this.analyser || !this.dataArray) return null;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate average frequency
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        
        // Calculate energy (RMS)
        let sumSquares = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sumSquares += Math.pow(this.dataArray[i] - 128, 2);
        }
        const rms = Math.sqrt(sumSquares / this.dataArray.length);
        
        // Detect beat (simple threshold)
        const beatThreshold = 20;
        const isBeat = rms > beatThreshold;
        
        return {
            average,
            rms,
            isBeat,
            max: Math.max(...Array.from(this.dataArray)),
            min: Math.min(...Array.from(this.dataArray))
        };
    }
    
    // Spectrum analyzer mode
    drawSpectrum() {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw frequency bands
        const bands = 32;
        const bandWidth = this.canvas.width / bands;
        
        for (let i = 0; i < bands; i++) {
            const start = Math.floor(i * this.dataArray.length / bands);
            const end = Math.floor((i + 1) * this.dataArray.length / bands);
            let sum = 0;
            
            for (let j = start; j < end; j++) {
                sum += this.dataArray[j];
            }
            
            const average = sum / (end - start);
            const height = (average / 255) * this.canvas.height;
            
            // Create gradient for band
            const gradient = this.ctx.createLinearGradient(
                i * bandWidth, this.canvas.height,
                i * bandWidth, this.canvas.height - height
            );
            gradient.addColorStop(0, this.colors.primary);
            gradient.addColorStop(1, this.colors.secondary);
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(i * bandWidth, this.canvas.height - height, bandWidth - 1, height);
        }
    }
}