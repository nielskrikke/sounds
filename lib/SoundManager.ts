
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
    
    // Cache for streamed audio elements (BGM/Ambience) to support reuse/crossfade
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

        // Silent oscillator to keep the audio pipeline active (anti-glitch for iOS)
        const silentOsc = this.audioContext.createOscillator();
        const silentGain = this.audioContext.createGain();
        silentOsc.type = 'sine';
        silentOsc.frequency.value = 440; 
        silentGain.gain.value = 0; 
        silentOsc.connect(silentGain);
        silentGain.connect(this.masterGain);
        silentOsc.start();

        // Master Output Element (The one AirPlay will target)
        this.airPlayAudioElement = new Audio();
        this.airPlayAudioElement.crossOrigin = "anonymous";
        this.airPlayAudioElement.srcObject = this.destinationNode.stream;
        this.airPlayAudioElement.autoplay = true;
        (this.airPlayAudioElement as any).playsInline = true; // Help on iOS
        this.airPlayAudioElement.muted = false;
        
        this.onStateChange = onStateChangeCallback;
        
        this.audioContext.onstatechange = () => {
             this.updatePlayingStates();
        };

        // GLOBAL IOS UNLOCKER
        // Capture the first interaction to ensure AudioContext and Output Element are running.
        const unlock = () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(e => console.debug("Context resume failed", e));
            }
            if (this.airPlayAudioElement.paused) {
                this.airPlayAudioElement.play().catch(e => console.debug("Output play failed", e));
            }
            // Once running, we can remove the listeners to save overhead
            if (this.audioContext.state === 'running' && !this.airPlayAudioElement.paused) {
                 document.removeEventListener('click', unlock);
                 document.removeEventListener('touchstart', unlock);
                 document.removeEventListener('keydown', unlock);
            }
        };

        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
        document.addEventListener('keydown', unlock);
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

        // NOTE: We do NOT pre-load streams (BGM/Ambience) here anymore.
        // Creating dozens of HTMLAudioElements at startup causes iOS to hit resource limits,
        // resulting in total silence. Streams are now initialized lazily in playSound.
    }

    private async ensureAudioContextReady() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        // Ensure the master output element is playing the stream
        if (this.airPlayAudioElement.paused) {
            try {
                await this.airPlayAudioElement.play();
            } catch (e) {
                // This might fail if not called from a user gesture, but the global unlocker catches most cases.
                console.warn("Could not play master output element:", e);
            }
        }
    }

    public async playSound(sound: Sound) {
        // Ensure context is ready
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

        // Lazy Load / Retrieve from cache
        let cached = this.streamCache.get(sound.id);

        if (!cached) {
            const element = new Audio();
            element.crossOrigin = "anonymous";
            element.src = sound.publicURL;
            element.loop = true;
            element.preload = "auto";
            (element as any).playsInline = true;
            
            // Note: We don't call element.load() here aggressively if we aren't playing immediately,
            // but since we are about to play, it's fine.
            
            cached = { element, sourceNode: null };
            this.streamCache.set(sound.id, cached);
        }

        const { element } = cached;

        // Ensure volume is reset (it might have been faded out previously?)
        // Actually we control volume via gainNode, but element volume should be 1.
        element.volume = 1; 

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

                const playPromise = element.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.fadeIn(activeSound, isBGM);
                        this.updatePlayingStates();
                    }).catch(e => {
                        if (e.name === 'AbortError') return; // Interrupted by stop, expected.
                        console.error("Playback failed:", e);
                        this.stopImmediate(activeSound);
                    });
                }
            } catch (e) {
                console.error("Error connecting streamed sound:", e);
            }
        };

        // iOS Logic: check readyState or wait for canplay
        if (element.readyState >= 3) { // HAVE_FUTURE_DATA
            connectAndPlay();
        } else {
            element.addEventListener('canplay', () => connectAndPlay(), { once: true });
            element.load(); // Kick off loading
        }
    }

    private playSoundEffect(sound: Sound) {
        const buffer = this.sfxBuffers.get(sound.id);
        if (!buffer) {
             this.loadSound(sound).then(() => {
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
        
        // Smooth interpolation
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
                this.airPlayAudioElement.play().catch(e => console.warn("Global resume play failed:", e));
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
