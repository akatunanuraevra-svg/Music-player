// Utility Functions
class Utils {
    constructor() {
        // Initialize utility methods
    }
    
    // Format time in MM:SS
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity || seconds === 0) {
            return '0:00';
        }
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Format time with hours
    formatTimeWithHours(seconds) {
        if (seconds < 3600) {
            return this.formatTime(seconds);
        }
        
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Generate random ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    // Merge objects deeply
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }
    
    // Check if value is an object
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    // Get query parameters
    getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });
        
        return params;
    }
    
    // Set query parameters
    setQueryParams(params) {
        const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
        
        const newUrl = window.location.pathname + (queryString ? `?${queryString}` : '');
        window.history.pushState({}, '', newUrl);
    }
    
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            
            // Fallback for older browsers
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (err2) {
                console.error('Fallback copy failed:', err2);
                return false;
            }
        }
    }
    
    // Download data as file
    downloadData(data, filename, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Read file as text
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    // Read file as data URL
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // Get image dimensions
    getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({
                width: img.width,
                height: img.height,
                aspectRatio: img.width / img.height
            });
            img.onerror = reject;
            img.src = url;
        });
    }
    
    // Create element with attributes
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.keys(attributes).forEach(key => {
            if (key === 'style' && typeof attributes[key] === 'object') {
                Object.assign(element.style, attributes[key]);
            } else if (key === 'class') {
                element.className = attributes[key];
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, attributes[key]);
            } else {
                element[key] = attributes[key];
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    }
    
    // Create DOM from HTML string
    htmlToElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }
    
    // Remove all children from element
    removeAllChildren(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
    
    // Get scroll position
    getScrollPosition(element = window) {
        if (element === window) {
            return {
                x: window.pageXOffset || document.documentElement.scrollLeft,
                y: window.pageYOffset || document.documentElement.scrollTop
            };
        }
        
        return {
            x: element.scrollLeft,
            y: element.scrollTop
        };
    }
    
    // Scroll to element smoothly
    scrollToElement(element, offset = 0) {
        const elementRect = element.getBoundingClientRect();
        const scrollPosition = this.getScrollPosition();
        const targetPosition = elementRect.top + scrollPosition.y + offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
    
    // Check if element is in viewport
    isInViewport(element, partial = false) {
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const vertInView = partial ? 
            rect.top <= windowHeight && rect.bottom >= 0 :
            rect.top >= 0 && rect.bottom <= windowHeight;
            
        const horInView = partial ?
            rect.left <= windowWidth && rect.right >= 0 :
            rect.left >= 0 && rect.right <= windowWidth;
        
        return vertInView && horInView;
    }
    
    // Create UUID
    createUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Parse CSV string
    parseCSV(csvText, delimiter = ',') {
        const lines = csvText.split('\n');
        const headers = lines[0].split(delimiter);
        const result = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const obj = {};
            const currentline = lines[i].split(delimiter);
            
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = currentline[j] ? currentline[j].trim() : '';
            }
            
            result.push(obj);
        }
        
        return result;
    }
    
    // Convert array to CSV
    arrayToCSV(data, headers = null) {
        const headerList = headers || Object.keys(data[0]);
        const csv = [
            headerList.join(','),
            ...data.map(row => headerList.map(header => {
                const cell = row[header];
                return typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell;
            }).join(','))
        ];
        
        return csv.join('\n');
    }
    
    // Capitalize first letter
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    
    // Truncate text with ellipsis
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }
    
    // Generate gradient colors
    generateGradient(color1, color2, steps) {
        const gradient = [];
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        
        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
            const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
            const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
            gradient.push(`rgb(${r}, ${g}, ${b})`);
        }
        
        return gradient;
    }
    
    // Convert hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    // Convert RGB to hex
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    // Get contrast color (black or white)
    getContrastColor(hexColor) {
        const rgb = this.hexToRgb(hexColor);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }
    
    // Format number with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Get current date in YYYY-MM-DD format
    getCurrentDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    
    // Get time ago string
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';
        
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';
        
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' days ago';
        
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';
        
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';
        
        return Math.floor(seconds) + ' seconds ago';
    }
    
    // Sleep/delay function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Retry function with exponential backoff
    async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            await this.sleep(delay);
            return this.retry(fn, retries - 1, delay * 2);
        }
    }
    
    // Validate email
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Validate URL
    isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    // Escape HTML special characters
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Unescape HTML special characters
    unescapeHtml(text) {
        const map = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#039;': "'"
        };
        return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, m => map[m]);
    }
    
    // Get browser information
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let version = '';
        
        // Detect browser
        if (ua.indexOf('Firefox') > -1) {
            browser = 'Firefox';
            version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
        } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
            browser = 'Chrome';
            version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
        } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
            browser = 'Safari';
            version = ua.match(/Version\/(\d+)/)?.[1] || '';
        } else if (ua.indexOf('Edg') > -1) {
            browser = 'Edge';
            version = ua.match(/Edg\/(\d+)/)?.[1] || '';
        } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
            browser = 'Opera';
            version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || '';
        }
        
        return {
            name: browser,
            version: version,
            userAgent: ua,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine
        };
    }
    
    // Check if touch device
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    
    // Get device pixel ratio
    getPixelRatio() {
        return window.devicePixelRatio || 1;
    }
    
    // Get viewport dimensions
    getViewportDimensions() {
        return {
            width: window.innerWidth || document.documentElement.clientWidth,
            height: window.innerHeight || document.documentElement.clientHeight
        };
    }
    
    // Detect dark mode preference
    prefersDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Detect reduced motion preference
    prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
}