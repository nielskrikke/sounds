
import { Sound, PlayingSound } from '../types';

type SoundManagerState = {
    playingStates: Record<string, boolean>;
    audioContextState: AudioContextState;
};

interface ActiveSound {
    id: string;
    sound: Sound;
    gainNode: GainNode;
    // For BGM/Ambience (Streamed)
    audioElement?: HTMLAudioElement;
    mediaElementSource?: MediaElementAudioSourceNode;
    // For SFX (Buffered)
    bufferSource?: AudioBufferSourceNode;
    
    volumeMultiplier: number; // 0.0 to 1.0
    fadeInterval: number | null;
}

interface CachedStream {
    element: HTMLAudioElement;
    sourceNode: MediaElementAudioSourceNode | null;
}

export class SoundManager {
    private audioContext: AudioContext;
    private masterGain: GainNode;
    private destinationNode: MediaStreamAudioDestinationNode;
    
    // This element plays the mixed stream and is the target for AirPlay
    public airPlayAudioElement: HTMLAudioElement;

    private sfxBuffers: Map<string, AudioBuffer> = new Map();
    
    // Cache for streamed audio elements (BGM/Ambience) to support pre-buffering
    private streamCache: Map<string, CachedStream> = new Map();
    
    private activeSounds: Map<string, ActiveSound> = new Map();

    private masterBGMVolume: number = 0.5;
    private readonly fadeTimeMs: number = 2500;
    private readonly fadeIntervalMs: number = 50;
    
    private onStateChange: (state: SoundManagerState) => void;

    constructor(onStateChangeCallback: (state: SoundManagerState) => void) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();

        // Master Mixer
        // All sounds (SFX, BGM, Ambience) must connect here to be heard via AirPlay
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 1.0;

        // Destination for AirPlay aggregation
        // We pipe the MasterGain into a MediaStream, which is then played by a single <audio> element.
        this.destinationNode = this.audioContext.createMediaStreamDestination();
        this.masterGain.connect(this.destinationNode);

        // FIX: Add a silent oscillator to keep the audio pipeline active.
        // This prevents "stuck buffer" glitches on mobile devices (especially iOS) when all other sounds are stopped.
        // Without this, the MediaStreamDestination might stop producing frames, causing the last buffer to loop.
        const silentOsc = this.audioContext.createOscillator();
        const silentGain = this.audioContext.createGain();
        silentOsc.type = 'sine';
        silentOsc.frequency.value = 440; // Frequency doesn't matter at 0 gain
        silentGain.gain.value = 0; // Absolute silence
        silentOsc.connect(silentGain);
        silentGain.connect(this.masterGain);
        silentOsc.start();

        // Master Output Element (The one AirPlay will target)
        this.airPlayAudioElement = new Audio();
        this.airPlayAudioElement.crossOrigin = "anonymous";
        this.airPlayAudioElement.srcObject = this.destinationNode.stream;
        this.airPlayAudioElement.autoplay = true;
        (this.airPlayAudioElement as any).playsInline = true; // Help on iOS
        // Explicitly unmute to ensure the stream plays
        this.airPlayAudioElement.muted = false;
        
        this.onStateChange = onStateChangeCallback;
        
        this.audioContext.onstatechange = () => {
             this.updatePlayingStates();
        };
    }

    private updatePlayingStates() {
        const states: Record<string, boolean> = {};
        this.activeSounds.forEach(item => states[item.id] = true);
        
        this.onStateChange({
            playingStates: states,
            audioContextState: this.audioContext.state,
        });
    }
    
    public async loadSound(sound: Sound): Promise<void> {
        // Only pre-decode One-shots. 
        if (sound.type === 'One-shots') {
            if (this.sfxBuffers.has(sound.id) || !sound.publicURL) return;
            try {
                const response = await fetch(sound.publicURL);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sfxBuffers.set(sound.id, audioBuffer);
            } catch (error) {
                console.error(`Error loading sound ${sound.name}:`, error);
            }
        }
    }

    public async loadSounds(sounds: Sound[]): Promise<void> {
        // 1. One-shots: Decode into memory (Full Buffer)
        const sfx = sounds.filter(s => s.type === 'One-shots');
        await Promise.all(sfx.map(sound => this.loadSound(sound)));

        // 2. Streams: Pre-initialize Audio Elements (Partial Buffer)
        // This allows iOS to start buffering metadata and initial chunks so playback is instant.
        const streams = sounds.filter(s => s.type !== 'One-shots');
        streams.forEach(sound => {
             if (!sound.publicURL) return;
             // Skip if already cached
             if (this.streamCache.has(sound.id)) return;

             const element = new Audio();
             element.crossOrigin = "anonymous";
             element.src = sound.publicURL;
             element.loop = true;
             element.preload = "auto"; // Request full buffer
             (element as any).playsInline = true; // iOS helper
             
             // Trigger load to encourage the browser to fetch metadata/buffer
             element.load();

             this.streamCache.set(sound.id, { element, sourceNode: null });
        });
    }

    private async ensureAudioContextReady() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        // Ensure the master output element is playing the stream
        // This acts as the carrier for all app audio
        if (this.airPlayAudioElement.paused) {
            try {
                await this.airPlayAudioElement.play();
            } catch (e) {
                console.warn("Could not play master output element:", e);
            }
        }
    }

    public async playSound(sound: Sound) {
        await this.ensureAudioContextReady();

        switch (sound.type) {
            case 'Background Music':
                this.playBGM(sound);
                break;
            case 'Ambience':
                this.playAmbience(sound);
                break;
            case 'One-shots':
                this.playSoundEffect(sound);
                break;
        }
    }
    
    public stopSound(sound: Sound) {
        const activeSound = this.activeSounds.get(sound.id);
        if (!activeSound) return;

        if (sound.type === 'One-shots') {
            this.stopImmediate(activeSound);
        } else {
            this.fadeOut(activeSound, () => {
                this.stopImmediate(activeSound);
            });
        }
    }

    private stopImmediate(activeSound: ActiveSound) {
        if (activeSound.fadeInterval) clearInterval(activeSound.fadeInterval);
        
        try {
            // Stop One-shots (Buffered)
            if (activeSound.bufferSource) {
                activeSound.bufferSource.stop();
                activeSound.bufferSource.disconnect();
            }

            // Stop Streams (Elements)
            if (activeSound.audioElement) {
                activeSound.audioElement.pause();
                // Rewind to start for next playback
                activeSound.audioElement.currentTime = 0;
                
                // IMPORTANT: Do NOT clear src or removeAttribute.
                // Keeping the src allows the buffer to persist in the cache.
            }

            // Disconnect source from the mix
            if (activeSound.mediaElementSource) {
                activeSound.mediaElementSource.disconnect();
            }

            activeSound.gainNode.disconnect();
        } catch (e) {
            console.error("Error disconnecting sound nodes:", e);
        }
        
        this.activeSounds.delete(activeSound.id);
        this.updatePlayingStates();
    }

    // --- Playback Implementations ---

    private playBGM(sound: Sound) {
        if (this.activeSounds.has(sound.id)) return;
    
        // Stop other BGMs
        const otherBGMs = Array.from(this.activeSounds.values())
            .filter(item => item.sound.type === 'Background Music');
        otherBGMs.forEach(item => this.stopSound(item.sound)); // Triggers fadeOut
        
        this.startStreamedSound(sound, true);
    }

    private playAmbience(sound: Sound) {
        if (this.activeSounds.has(sound.id)) return;
        this.startStreamedSound(sound, false);
    }

    private startStreamedSound(sound: Sound, isBGM: boolean) {
        if (!sound.publicURL) return;

        // Retrieve from cache (created in loadSounds) or create new fallback
        let cached = this.streamCache.get(sound.id);

        if (!cached) {
            const element = new Audio();
            element.crossOrigin = "anonymous";
            element.src = sound.publicURL;
            element.loop = true;
            element.preload = "auto";
            (element as any).playsInline = true;
            element.load();
            cached = { element, sourceNode: null };
            this.streamCache.set(sound.id, cached);
        }

        const { element } = cached;

        // Prepare the Gain Node
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0; // Silent start for fade-in
        gainNode.connect(this.masterGain);

        const connectAndPlay = () => {
            try {
                // Ensure MediaElementSourceNode exists (singleton per element)
                if (!cached!.sourceNode) {
                    cached!.sourceNode = this.audioContext.createMediaElementSource(element);
                }

                // Connect to the new gain node for this session
                cached!.sourceNode.connect(gainNode);

                const activeSound: ActiveSound = {
                    id: sound.id,
                    sound: sound,
                    gainNode: gainNode,
                    audioElement: element,
                    mediaElementSource: cached!.sourceNode,
                    volumeMultiplier: 0,
                    fadeInterval: null
                };

                this.activeSounds.set(sound.id, activeSound);

                element.play().then(() => {
                    this.fadeIn(activeSound, isBGM);
                    this.updatePlayingStates();
                }).catch(e => {
                    // Fix for "The play() request was interrupted"
                    if (e.name === 'AbortError') return;
                    console.error("Playback failed:", e);
                    this.stopImmediate(activeSound);
                });
            } catch (e) {
                console.error("Error connecting streamed sound:", e);
            }
        };

        // On iOS, if we have data, we can try playing.
        // If 'preload=auto' worked, readyState should be sufficient.
        if (element.readyState >= 3) { // HAVE_FUTURE_DATA
            connectAndPlay();
        } else {
            element.addEventListener('canplay', () => connectAndPlay(), { once: true });
            // If it was paused/stopped previously, load() ensures it's ready to fetch again if needed
            if (element.paused && element.readyState === 0) {
                 element.load();
            }
        }
    }

    private playSoundEffect(sound: Sound) {
        const buffer = this.sfxBuffers.get(sound.id);
        if (!buffer) {
             this.loadSound(sound).then(() => {
                // Ensure context wasn't suspended during load
                this.ensureAudioContextReady().then(() => {
                    const retryBuffer = this.sfxBuffers.get(sound.id);
                    if (retryBuffer) this.playSfxInternal(sound, retryBuffer);
                });
            });
            return;
        }
        
        if (this.activeSounds.has(sound.id)) {
             this.stopImmediate(this.activeSounds.get(sound.id)!);
        }

        this.playSfxInternal(sound, buffer);
    }

    private playSfxInternal(sound: Sound, buffer: AudioBuffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = sound.volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const activeSound: ActiveSound = {
            id: sound.id,
            sound: sound,
            gainNode: gainNode,
            bufferSource: source,
            volumeMultiplier: 1,
            fadeInterval: null
        };

        this.activeSounds.set(sound.id, activeSound);

        source.onended = () => {
            const current = this.activeSounds.get(sound.id);
            if (current === activeSound) {
                this.stopImmediate(activeSound);
            }
        };
        
        source.start(0);
        this.updatePlayingStates();
    }

    // --- Fading Logic ---

    private fadeIn(activeSound: ActiveSound, isBGM: boolean) {
        if (activeSound.fadeInterval) clearInterval(activeSound.fadeInterval);

        activeSound.fadeInterval = window.setInterval(() => {
            activeSound.volumeMultiplier += (this.fadeIntervalMs / this.fadeTimeMs);
            if (activeSound.volumeMultiplier >= 1) {
                activeSound.volumeMultiplier = 1;
                if (activeSound.fadeInterval) clearInterval(activeSound.fadeInterval);
                activeSound.fadeInterval = null;
            }
            this.updateVolume(activeSound);
        }, this.fadeIntervalMs);
    }

    private fadeOut(activeSound: ActiveSound, onComplete: () => void) {
        if (activeSound.fadeInterval) clearInterval(activeSound.fadeInterval);

        activeSound.fadeInterval = window.setInterval(() => {
            activeSound.volumeMultiplier -= (this.fadeIntervalMs / this.fadeTimeMs);
            if (activeSound.volumeMultiplier <= 0) {
                activeSound.volumeMultiplier = 0;
                if (activeSound.fadeInterval) clearInterval(activeSound.fadeInterval);
                activeSound.fadeInterval = null;
                this.updateVolume(activeSound);
                onComplete();
            } else {
                this.updateVolume(activeSound);
            }
        }, this.fadeIntervalMs);
    }

    private updateVolume(activeSound: ActiveSound) {
        let targetVol = activeSound.sound.volume * activeSound.volumeMultiplier;
        
        if (activeSound.sound.type === 'Background Music') {
            targetVol *= this.masterBGMVolume;
        }
        
        // Smoothly interpolate
        activeSound.gainNode.gain.setTargetAtTime(targetVol, this.audioContext.currentTime, 0.05);
    }

    // --- Global Controls ---

    public async toggleGlobalPlayPause() {
        if (this.audioContext.state === 'running') {
             await this.audioContext.suspend();
             this.activeSounds.forEach(s => s.audioElement?.pause());
             this.airPlayAudioElement.pause();
        } else {
            await this.audioContext.resume();
             this.activeSounds.forEach(s => s.audioElement?.play());
             
             if (this.airPlayAudioElement.paused) {
                try {
                    await this.airPlayAudioElement.play();
                } catch (e) {
                    console.warn("Could not play master output element:", e);
                }
             }
        }
        this.updatePlayingStates();
    }

    public stopAllSounds() {
        Array.from(this.activeSounds.values()).forEach(s => this.stopImmediate(s));
    }

    public setMasterBGMVolume(volume: number) {
        this.masterBGMVolume = volume;
        this.activeSounds.forEach(activeSound => {
            if (activeSound.sound.type === 'Background Music') {
                this.updateVolume(activeSound);
            }
        });
    }

    public isPlaying(soundId: string): boolean {
        return this.activeSounds.has(soundId);
    }
}
