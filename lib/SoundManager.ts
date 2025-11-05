
import { Sound, PlayingSound, SoundType } from '../types';

export class SoundManager {
    private audioContext: AudioContext;
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeBGM: PlayingSound | null = null;
    private lastBGMSound: Sound | null = null;
    private isBGMPlaying: boolean = false;
    private activeAMB: PlayingSound | null = null;
    private activeSEs: Map<string, PlayingSound> = new Map();
    private masterBGMVolume: number = 0.5;
    private readonly fadeTime: number = 4;
    private readonly rampTime: number = 0.1;
    public airPlayAudioElement: HTMLAudioElement;
    private onStateChange: (playingStates: Record<string, boolean>) => void;

    constructor(onStateChangeCallback: (playingStates: Record<string, boolean>) => void) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.airPlayAudioElement = document.createElement('audio');
        this.airPlayAudioElement.id = 'airplay-audio';
        this.airPlayAudioElement.loop = true;
        document.body.appendChild(this.airPlayAudioElement);
        this.onStateChange = onStateChangeCallback;
    }

    private updatePlayingStates() {
        const states: Record<string, boolean> = {};
        if (this.activeBGM) states[this.activeBGM.sound.id] = this.isBGMPlaying;
        if (this.activeAMB) states[this.activeAMB.sound.id] = true;
        this.activeSEs.forEach(ps => states[ps.sound.id] = true);
        this.onStateChange(states);
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
            case 'Sound Effect':
                this.playSoundEffect(sound, buffer);
                break;
        }
        this.updatePlayingStates();
    }
    
    public stopSound(sound: Sound) {
        switch (sound.type) {
            case 'Background Music':
                if (this.activeBGM?.sound.id === sound.id) this.fadeOutBGM();
                break;
            case 'Ambience':
                 if (this.activeAMB?.sound.id === sound.id) this.stopAmbience();
                break;
            case 'Sound Effect':
                if (this.activeSEs.has(sound.id)) this.stopSoundEffect(sound);
                break;
        }
         this.updatePlayingStates();
    }

    private playBGM(sound: Sound, buffer: AudioBuffer) {
        if (this.activeBGM?.sound.id === sound.id) {
            this.toggleBGMPlayPause();
            return;
        }
        
        const oldBGM = this.activeBGM;
        
        this.lastBGMSound = sound;
        const newBGM = this.createPlayingSound(sound, buffer, true);
        this.activeBGM = newBGM;
        
        if (oldBGM) {
            this.performFadeOut(oldBGM);
        }
        
        this.fadeInBGM();
        
        this.airPlayAudioElement.src = sound.publicURL || '';
        if (this.isBGMPlaying) {
             this.airPlayAudioElement.play().catch(e => console.error("AirPlay audio failed to play:", e));
        }
    }

    private fadeInBGM() {
        if (!this.activeBGM) return;
        this.isBGMPlaying = true;
        this.activeBGM.source.start(0);
        this.activeBGM.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.activeBGM.gainNode.gain.linearRampToValueAtTime(this.masterBGMVolume * this.activeBGM.sound.volume, this.audioContext.currentTime + this.fadeTime);
        this.airPlayAudioElement.volume = this.masterBGMVolume * this.activeBGM.sound.volume;
        this.airPlayAudioElement.play().catch(e => console.error("AirPlay audio failed to play:", e));
        this.updatePlayingStates();
    }

    private fadeOutBGM(onComplete?: () => void) {
        if (!this.activeBGM) return;
        const oldBGM = this.activeBGM;
        this.activeBGM = null;
        
        this.performFadeOut(oldBGM, onComplete);
        
        this.airPlayAudioElement.pause();
        this.airPlayAudioElement.src = '';
    }

    private performFadeOut(playingSound: PlayingSound, onComplete?: () => void) {
        playingSound.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        playingSound.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + this.fadeTime);
        
        setTimeout(() => {
            playingSound.source.stop();
            if (onComplete) onComplete();
        }, this.fadeTime * 1000);
    }

    public toggleBGMPlayPause() {
        if (!this.lastBGMSound) return;

        if (!this.activeBGM) { // Resuming from paused state
            this.playSound(this.lastBGMSound);
        } else { // Pausing
            this.isBGMPlaying = false;
            this.fadeOutBGM();
        }
        this.updatePlayingStates();
    }
    
    private playAmbience(sound: Sound, buffer: AudioBuffer) {
        if (this.activeAMB?.sound.id === sound.id) {
            this.stopAmbience();
            return;
        }
        if (this.activeAMB) {
            this.stopAmbience();
        }
        const playingSound = this.createPlayingSound(sound, buffer, sound.loop);
        this.activeAMB = playingSound;
        playingSound.source.start(0);
        playingSound.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        playingSound.gainNode.gain.linearRampToValueAtTime(sound.volume, this.audioContext.currentTime + this.rampTime);
    }
    
    private stopAmbience() {
        if (!this.activeAMB) return;
        const oldAMB = this.activeAMB;
        this.activeAMB = null;
        oldAMB.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
        oldAMB.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + this.rampTime);
        setTimeout(() => oldAMB.source.stop(), this.rampTime * 1000);
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
    }

    private stopSoundEffect(sound: Sound) {
        const playingSound = this.activeSEs.get(sound.id);
        if (playingSound) {
            playingSound.source.stop();
            this.activeSEs.delete(sound.id);
        }
    }

    public stopAllSounds() {
        if (this.activeBGM) this.fadeOutBGM();
        if (this.activeAMB) this.stopAmbience();
        this.activeSEs.forEach(ps => ps.source.stop());
        this.activeSEs.clear();
        this.isBGMPlaying = false;
        this.lastBGMSound = null;
        this.updatePlayingStates();
    }

    public setMasterBGMVolume(volume: number) {
        this.masterBGMVolume = volume;
        if (this.activeBGM && this.isBGMPlaying) {
            const targetVolume = this.masterBGMVolume * this.activeBGM.sound.volume;
            this.activeBGM.gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + this.rampTime);
            this.airPlayAudioElement.volume = targetVolume;
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
        return (this.activeBGM?.sound.id === soundId && this.isBGMPlaying) ||
               this.activeAMB?.sound.id === soundId ||
               this.activeSEs.has(soundId);
    }
}
