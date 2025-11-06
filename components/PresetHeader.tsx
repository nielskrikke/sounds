import React from 'react';
import { SoundboardPreset } from '../types';
import { Play, Pause, Volume2, VolumeX, LogOut, ListMusic, Save } from 'lucide-react';
import { AirPlayButton } from './AirPlayButton';

interface PresetHeaderProps {
  presets: SoundboardPreset[];
  currentPresetId: string | null;
  hasUnsavedChanges: boolean;
  onLoadPreset: (presetId: string) => void;
  onLoadLibrary: () => void;
  onManagePresets: () => void;
  onSaveChanges: () => void;
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
  hasUnsavedChanges,
  onLoadPreset,
  onLoadLibrary,
  onManagePresets,
  onSaveChanges,
  isBgmPlaying,
  onToggleBgm,
  bgmVolume,
  onBgmVolumeChange,
  onLogout,
  airplayElement
}) => {
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === 'library') {
      onLoadLibrary();
    } else {
      onLoadPreset(value);
    }
  };

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-700">
      <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto flex-wrap">
        <ListMusic className="text-blue-400" size={24}/>
        <div className="flex-grow">
          <select
            value={currentPresetId || 'library'}
            onChange={handleSelectChange}
            className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="library">
              Sound Library {currentPresetId === null && hasUnsavedChanges ? '*' : ''}
            </option>
            {presets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name}{currentPresetId === preset.id && hasUnsavedChanges ? '*' : ''}
              </option>
            ))}
          </select>
        </div>
        {hasUnsavedChanges && currentPresetId && (
            <button onClick={onSaveChanges} className="text-sm text-green-400 hover:text-green-300 whitespace-nowrap bg-slate-700 px-3 py-2 rounded-md flex items-center gap-2 transition-colors">
                <Save size={16} /> Save
            </button>
        )}
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
