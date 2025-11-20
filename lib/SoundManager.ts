
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

export class SoundManager {
    private audioContext: AudioContext;
    private masterGain: GainNode;
    private destinationNode: MediaStreamAudioDestinationNode;
    
    // This element plays the mixed stream and is the target for AirPlay
    public airPlayAudioElement: HTMLAudioElement;

    private sfxBuffers: Map<string, AudioBuffer> = new Map();
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

        // Master Output Element (The one AirPlay will target)
        this.airPlayAudioElement = new Audio();
        this.airPlayAudioElement.crossOrigin = "anonymous";
        this.airPlayAudioElement.srcObject = this.destinationNode.stream;
        this.airPlayAudioElement.autoplay = true;
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
        // BGM/Ambience will be streamed on demand to save memory.
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
        const sfx = sounds.filter(s => s.type === 'One-shots');
        await Promise.all(sfx.map(sound => this.loadSound(sound)));
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
            if (activeSound.bufferSource) {
                activeSound.bufferSource.stop();
                activeSound.bufferSource.disconnect();
            }
            if (activeSound.audioElement) {
                activeSound.audioElement.pause();
                activeSound.audioElement.src = ""; // Release memory
            }
            if (activeSound.mediaElementSource) {
                activeSound.mediaElementSource.disconnect();
            }
            activeSound.gainNode.disconnect();
        } catch (e) {
            console.error("Error stopping sound:", e);
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

        const element = new Audio(sound.publicURL);
        element.loop = true;
        element.crossOrigin = "anonymous"; // Critical for createMediaElementSource
        
        // Create WebAudio nodes
        // Source -> Gain -> MasterGain
        let source: MediaElementAudioSourceNode | undefined;
        try {
            source = this.audioContext.createMediaElementSource(element);
        } catch (e) {
            console.error("Failed to create media element source (likely CORS issue):", e);
            return;
        }

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0; // Start silent for fade-in

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        const activeSound: ActiveSound = {
            id: sound.id,
            sound: sound,
            gainNode: gainNode,
            audioElement: element,
            mediaElementSource: source,
            volumeMultiplier: 0,
            fadeInterval: null
        };

        this.activeSounds.set(sound.id, activeSound);
        
        element.play().then(() => {
            this.fadeIn(activeSound, isBGM);
            this.updatePlayingStates();
        }).catch(e => {
            console.error("Playback failed:", e);
            this.stopImmediate(activeSound);
        });
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
        
        // Allow overlapping SFX, but track the latest one by ID for stopping capability
        // If we wanted polyphony for the *same* sound ID, we'd need a generated ID.
        // For now, restarting the same SFX stops the previous one to keep it simple.
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

        // Connect SFX to the MasterMixer, which feeds the AirPlay destination
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
            // Only remove if it hasn't been replaced
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
        // Do not call ensureAudioContextReady() here, as it forces resume.
        // We want to toggle based on the current state.

        if (this.audioContext.state === 'running') {
             // Suspend context and pause elements
             await this.audioContext.suspend();
             this.activeSounds.forEach(s => s.audioElement?.pause());
             this.airPlayAudioElement.pause();
        } else {
            // Resume context and play elements
            await this.audioContext.resume();
             this.activeSounds.forEach(s => s.audioElement?.play());
             
             // Ensure master output is playing (needed for AirPlay/output to work)
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
        // Clone array to iterate safely while deleting
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
