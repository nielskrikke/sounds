import React, { useState, useEffect } from 'react';
import { Sound, SoundboardPreset, SoundType } from '../types';

interface PresetEditorProps {
  preset?: SoundboardPreset;
  allSounds: Sound[];
  onSave: (name: string, soundIds: string[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const SoundGroup: React.FC<{ title: string; sounds: Sound[]; selectedIds: Set<string>; onToggle: (id: string) => void; }> = ({ title, sounds, selectedIds, onToggle }) => (
    <div>
        <h4 className="text-md font-semibold text-stone-300 mt-4 mb-2 border-b border-stone-600 pb-1">{title}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {sounds.map(sound => (
                <label key={sound.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-stone-700/50 transition-colors cursor-pointer">
                    <input
                        type="checkbox"
                        checked={selectedIds.has(sound.id)}
                        onChange={() => onToggle(sound.id)}
                        className="h-4 w-4 rounded accent-amber-500 bg-stone-600 border-stone-500"
                    />
                    <span className="text-white">{sound.name}</span>
                </label>
            ))}
        </div>
    </div>
);


export const PresetEditor: React.FC<PresetEditorProps> = ({ preset, allSounds, onSave, onCancel, isSubmitting }) => {
  const [name, setName] = useState('');
  const [selectedSoundIds, setSelectedSoundIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setSelectedSoundIds(new Set(preset.sounds.map(s => s.id)));
    } else {
        setName('');
        setSelectedSoundIds(new Set());
    }
  }, [preset]);

  const handleToggleSound = (soundId: string) => {
    setSelectedSoundIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(soundId)) {
        newSet.delete(soundId);
      } else {
        newSet.add(soundId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    await onSave(name, Array.from(selectedSoundIds));
  };

  const soundsByType = (type: SoundType) => allSounds.filter(s => s.type === type);

  return (
    <div>
      <h3 className="text-xl font-medieval font-semibold text-white mb-4">{preset ? 'Edit Preset' : 'Create New Preset'}</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="preset-name" className="block text-sm font-medium text-stone-300">Preset Name</label>
          <input
            id="preset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tavern Night"
            className="mt-1 block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"
            required
          />
        </div>
        <div>
            <p className="block text-sm font-medium text-stone-300 mb-2">Select Sounds ({selectedSoundIds.size} selected)</p>
            <div className="bg-stone-900/50 p-3 rounded-md border border-stone-700">
                <SoundGroup title="Background Music" sounds={soundsByType('Background Music')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
                <SoundGroup title="Ambience" sounds={soundsByType('Ambience')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
                <SoundGroup title="One-shots" sounds={soundsByType('One-shots')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
            </div>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-6">
        <button type="button" onClick={onCancel} className="py-2 px-4 rounded-md text-white bg-stone-600 hover:bg-stone-500">
          Cancel
        </button>
        <button onClick={handleSave} disabled={isSubmitting || !name.trim()} className="py-2 px-4 rounded-md text-white bg-amber-600 hover:bg-amber-500 disabled:bg-stone-500">
          {isSubmitting ? 'Saving...' : 'Save Preset'}
        </button>
      </div>
    </div>
  );
};