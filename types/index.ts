
export type SoundType = 'Background Music' | 'Ambience' | 'Sound Effect';

export interface Scene {
  id: string;
  name: string;
}

export interface Sound {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  publicURL?: string;
  type: SoundType;
  volume: number;
  loop: boolean;
  include_in_all_scenes: boolean;
  category_tag: string | null;
  mood_tag: string | null;
  location_tag: string | null;
  scenes?: Scene[];
  created_at: string;
}

// Fix: Add SoundboardPreset interface to resolve missing type errors.
export interface SoundboardPreset {
  id: string;
  user_id: string;
  name: string;
  sounds: Sound[];
  created_at: string;
  updated_at: string | null;
}

export interface UserProfile {
  id: string;
  username: string;
  created_at: string;
}

export interface PlayingSound {
  sound: Sound;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
}