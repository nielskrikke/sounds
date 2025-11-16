
import { Sound, PlayingSound } from '../types';

type SoundManagerState = {
    playingStates: Record<string, boolean>;
    audioContextState: AudioContextState;
};

export class SoundManager {
    private audioContext: AudioContext;
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeBGMs: Map<string, PlayingSound> = new Map();
    private activeAMBs: Map<string, PlayingSound> = new Map();
    private activeSEs: Map<string, PlayingSound> = new Map();
    private masterBGMVolume: number = 0.5;
    private readonly fadeTime: number = 2.5;
    private readonly rampTime: number = 0.1;
    public airPlayAudioElement: HTMLAudioElement;
    private onStateChange: (state: SoundManagerState) => void;

    constructor(onStateChangeCallback: (state: SoundManagerState) => void) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.airPlayAudioElement = document.createElement('audio');
        this.airPlayAudioElement.id = 'airplay-audio';
        this.airPlayAudioElement.loop = true;
        this.airPlayAudioElement.muted = true;
        document.body.appendChild(this.airPlayAudioElement);
        this.onStateChange = onStateChangeCallback;
        
        this.audioContext.onstatechange = () => {
             this.updatePlayingStates();
        };
    }

    private updatePlayingStates() {
        const states: Record<string, boolean> = {};
        this.activeBGMs.forEach(ps => states[ps.sound.id] = true);
        this.activeAMBs.forEach(ps => states[ps.sound.id] = true);
        this.activeSEs.forEach(ps => states[ps.sound.id] = true);
        this.onStateChange({
            playingStates: states,
            audioContextState: this.audioContext.state,
        });
    }
    
    public async loadSound(sound: Sound): Promise<void> {
        if (this.audioBuffers.has(sound.id) || !sound.publicURL) return;
        try {
            const response = await fetch(sound.publicURL);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(sound.id, audioBuffer);
        } catch (error) {
            console.error(`Error loading sound ${sound.name}:`, error);
        }
    }

    public async loadSounds(sounds: Sound[]): Promise<void> {
        await Promise.all(sounds.map(sound => this.loadSound(sound)));
    }

    public playSound(sound: Sound) {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const buffer = this.audioBuffers.get(sound.id);
        if (!buffer) {
            console.warn(`Sound ${sound.name} not loaded.`);
            this.loadSound(sound).then(() => this.playSound(sound));
            return;
        }

        switch (sound.type) {
            case 'Background Music':
                this.playBGM(sound, buffer);
                break;
            case 'Ambience':
                this.playAmbience(sound, buffer);
                break;
            case 'One-shots':
                this.playSoundEffect(sound, buffer);
                break;
        }
    }
    
    public stopSound(sound: Sound) {
        switch (sound.type) {
            case 'Background Music':
                this.stopBGM(sound);
                break;
            case 'Ambience':
                 this.stopAmbience(sound);
                break;
            case 'One-shots':
                this.stopSoundEffect(sound);
                break;
        }
    }

    private playBGM(sound: Sound, buffer: AudioBuffer) {
        if (this.activeBGMs.has(sound.id)) return;
    
        // Crossfade: Stop any other BGMs that are currently playing.
        const otherBGMs = Array.from(this.activeBGMs.values()).filter(ps => ps.sound.id !== sound.id);
        otherBGMs.forEach(ps => this.stopBGM(ps.sound));
        
        const newBGM = this.createPlayingSound(sound, buffer, sound.loop);
        this.activeBGMs.set(sound.id, newBGM);
        
        newBGM.source.start(0);
        newBGM.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        newBGM.gainNode.gain.linearRampToValueAtTime(this.masterBGMVolume * newBGM.sound.volume, this.audioContext.currentTime + this.fadeTime);
        this.updatePlayingStates();
        
        // Always update AirPlay to the new track.
        this.airPlayAudioElement.src = sound.publicURL || '';
        this.airPlayAudioElement.volume = this.masterBGMVolume * newBGM.sound.volume;
        this.airPlayAudioElement.play().catch(e => console.error("AirPlay audio failed to play:", e));
    }

    private stopBGM(sound: Sound) {
        const playingSound = this.activeBGMs.get(sound.id);
        if (!playingSound) return;
        
        this.performFadeOut(playingSound, () => {
            this.activeBGMs.delete(sound.id);
            this.updatePlayingStates();

            if (this.activeBGMs.size === 0) {
                 this.airPlayAudioElement.pause();
                 this.airPlayAudioElement.src = '';
            }
        });
    }

    private performFadeOut(playingSound: PlayingSound, onComplete?: () => void) {
        playingSound.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        playingSound.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + this.fadeTime);
        
        setTimeout(() => {
            playingSound.source.stop();
            if (onComplete) onComplete();
        }, this.fadeTime * 1000);
    }
    
    public toggleGlobalPlayPause() {
        if (this.audioContext.state === 'running') {
            this.audioContext.suspend();
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    private playAmbience(sound: Sound, buffer: AudioBuffer) {
        if (this.activeAMBs.has(sound.id)) return;

        const playingSound = this.createPlayingSound(sound, buffer, sound.loop);
        this.activeAMBs.set(sound.id, playingSound);
        playingSound.source.start(0);
        playingSound.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        playingSound.gainNode.gain.linearRampToValueAtTime(sound.volume, this.audioContext.currentTime + this.rampTime);
        this.updatePlayingStates();
    }
    
    private stopAmbience(sound: Sound) {
        const oldAMB = this.activeAMBs.get(sound.id);
        if (!oldAMB) return;
        
        this.activeAMBs.delete(sound.id);
        oldAMB.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        oldAMB.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + this.rampTime);
        setTimeout(() => oldAMB.source.stop(), this.rampTime * 1000);
        this.updatePlayingStates();
    }
    
    private playSoundEffect(sound: Sound, buffer: AudioBuffer) {
        if(this.activeSEs.has(sound.id)) {
            this.stopSoundEffect(sound);
            return;
        }

        const playingSound = this.createPlayingSound(sound, buffer, false);
        this.activeSEs.set(sound.id, playingSound);
        playingSound.source.start(0);
        playingSound.gainNode.gain.setValueAtTime(sound.volume, this.audioContext.currentTime);
        
        playingSound.source.onended = () => {
            if (this.activeSEs.get(sound.id) === playingSound) {
                this.activeSEs.delete(sound.id);
                this.updatePlayingStates();
            }
        };
        this.updatePlayingStates();
    }

    private stopSoundEffect(sound: Sound) {
        const playingSound = this.activeSEs.get(sound.id);
        if (playingSound) {
            playingSound.source.stop(); // onended will handle removal
        }
    }

    public stopAllSounds() {
        this.activeBGMs.forEach(ps => this.stopBGM(ps.sound));
        this.activeAMBs.forEach(ps => this.stopAmbience(ps.sound));
        this.activeSEs.forEach(ps => ps.source.stop());
        this.activeSEs.clear();
        this.updatePlayingStates();
    }

    public setMasterBGMVolume(volume: number) {
        this.masterBGMVolume = volume;
        this.activeBGMs.forEach(playingSound => {
            const targetVolume = this.masterBGMVolume * playingSound.sound.volume;
            playingSound.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + this.rampTime);
        });
        
        if (this.activeBGMs.size > 0) {
            // Adjust volume of the AirPlay element, assuming it's playing the first BGM.
            const firstBgm = this.activeBGMs.values().next().value;
            if (firstBgm) {
                this.airPlayAudioElement.volume = this.masterBGMVolume * firstBgm.sound.volume;
            }
        }
    }

    private createPlayingSound(sound: Sound, buffer: AudioBuffer, loop: boolean): PlayingSound {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        const gainNode = this.audioContext.createGain();
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        return { sound, source, gainNode };
    }
    
    public isPlaying(soundId: string): boolean {
        return this.activeBGMs.has(soundId) ||
               this.activeAMBs.has(soundId) ||
               this.activeSEs.has(soundId);
    }
}