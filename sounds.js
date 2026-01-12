// ================================
// SOUND EFFECTS SYSTEM - MP3 Version
// Uses Web Audio API for playback with pitch variation
// ================================

class SoundManager {
    constructor() {
        // Check if Web Audio API is supported
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;

        // Sound file mappings
        this.sounds = {
            billTap: ['sounds/bill-tap1.mp3', 'sounds/bill-tap2.mp3'],
            coinTap: ['sounds/coin-tap1.mp3', 'sounds/coin-tap2.mp3'],
            keyTap: [
                'sounds/key-tap1.mp3',
                'sounds/key-tap2.mp3',
                'sounds/key-tap3.mp3',
                'sounds/key-tap4.mp3',
                'sounds/key-tap5.mp3',
                'sounds/key-tap6.mp3',
                'sounds/key-tap7.mp3',
                'sounds/key-tap8.mp3',
                'sounds/key-tap9.mp3'
            ],
            uiTap: ['sounds/ui-tap1.mp3', 'sounds/ui-tap2.mp3'],
            error: ['sounds/error.mp3'],
            success: ['sounds/success.mp3']
        };

        // Preloaded audio buffers
        this.buffers = {};

        // Pitch variation range (0.95 to 1.05 = ±5%)
        this.pitchVariationMin = 0.95;
        this.pitchVariationMax = 1.05;
    }

    async init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.preloadSounds();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported, sound disabled:', e);
            this.enabled = false;
        }
    }

    async preloadSounds() {
        const loadPromises = [];

        for (const [key, files] of Object.entries(this.sounds)) {
            this.buffers[key] = [];

            for (const file of files) {
                loadPromises.push(
                    this.loadAudioBuffer(file).then(buffer => {
                        this.buffers[key].push(buffer);
                    }).catch(err => {
                        console.warn(`Failed to load ${file}:`, err);
                    })
                );
            }
        }

        await Promise.all(loadPromises);
    }

    async loadAudioBuffer(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return await this.audioContext.decodeAudioData(arrayBuffer);
    }

    playSound(soundKey, pitchVariation = true) {
        if (!this.enabled || !this.audioContext || !this.buffers[soundKey]) return;

        // Get available buffers for this sound
        const buffers = this.buffers[soundKey];
        if (buffers.length === 0) return;

        // Randomly select one buffer
        const buffer = buffers[Math.floor(Math.random() * buffers.length)];

        // Create buffer source
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        // Apply random pitch variation if enabled
        if (pitchVariation) {
            const pitchShift = this.pitchVariationMin +
                Math.random() * (this.pitchVariationMax - this.pitchVariationMin);
            source.playbackRate.value = pitchShift;
        }

        // Connect to destination and play
        source.connect(this.audioContext.destination);
        source.start(0);
    }

    // Individual sound methods
    playKeyTap() {
        this.playSound('keyTap');
    }

    playBillTap() {
        this.playSound('billTap');
    }

    playCoinTap() {
        this.playSound('coinTap');
    }

    playSuccess() {
        this.playSound('success', false); // No pitch variation for success
    }

    playError() {
        this.playSound('error', false); // No pitch variation for error
    }

    playUITap() {
        this.playSound('uiTap');
    }

    // Toggle sounds on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Set enabled state
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Export singleton instance
const soundManager = new SoundManager();

// Auto-initialize on first user interaction
document.addEventListener('click', () => {
    if (!soundManager.initialized) {
        soundManager.init().catch(console.error);
    }
}, { once: true });
