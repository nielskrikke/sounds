
import React from 'react';
import { SoundboardPreset } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut, ListMusic } from 'lucide-react';
import { AirPlayButton } from './AirPlayButton';

interface PresetHeaderProps {
  presets: SoundboardPreset[];
  currentPresetId: string | null;
  onLoadPreset: (presetId: string) => void;
  onManagePresets: () => void;
  isBgmPlaying: boolean;
  onToggleBgm: () => void;
  bgmVolume: number;
  onBgmVolumeChange: (volume: number) => void;
  onLogout: () => void;
  airplayElement: HTMLAudioElement | null;
}

export const PresetHeader: React.FC<PresetHeaderProps> = ({
  presets,
  currentPresetId,
  onLoadPreset,
  onManagePresets,
  isBgmPlaying,
  onToggleBgm,
  bgmVolume,
  onBgmVolumeChange,
  onLogout,
  airplayElement
}) => {
  const currentPresetName = presets.find(p => p.id === currentPresetId)?.name || "Unsaved Changes";

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <ListMusic className="text-blue-400" size={24}/>
        <div className="flex-grow">
          <select
            value={currentPresetId || ''}
            onChange={(e) => onLoadPreset(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="" disabled>{currentPresetName}</option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>{preset.name}</option>
            ))}
          </select>
        </div>
        <button onClick={onManagePresets} className="text-sm text-blue-400 hover:text-blue-300 whitespace-nowrap">
          Manage Presets
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 w-full sm:w-auto">
        <button
          onClick={onToggleBgm}
          className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          aria-label={isBgmPlaying ? "Pause Background Music" : "Play Background Music"}
        >
          {isBgmPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="flex items-center gap-2 w-40">
          {bgmVolume > 0 ? <Volume2 size={20} className="text-slate-400"/> : <VolumeX size={20} className="text-slate-400"/>}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bgmVolume}
            onChange={(e) => onBgmVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
        <AirPlayButton audioRef={airplayElement} />
        <button onClick={onLogout} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};
