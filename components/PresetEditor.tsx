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
        <h4 className="text-xs font-black uppercase tracking-widest text-dnd-text/40 mt-6 mb-3 border-b border-white/5 pb-1">{title}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {sounds.map(sound => (
                <label key={sound.id} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={selectedIds.has(sound.id)}
                        onChange={() => onToggle(sound.id)}
                        className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10"
                    />
                    <span className="text-dnd-text group-hover:text-dnd-gold transition-colors font-medium">{sound.name}</span>
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
      <h3 className="text-xl font-serif font-bold text-dnd-text mb-6">{preset ? 'Edit Preset' : 'Create New Preset'}</h3>
      <div className="space-y-6">
        <div>
          <label htmlFor="preset-name" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Preset Name</label>
          <input
            id="preset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tavern Night"
            className="mt-1 block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"
            required
          />
        </div>
        <div>
            <p className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-3">Select Sounds ({selectedSoundIds.size} selected)</p>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <SoundGroup title="Background Music" sounds={soundsByType('Background Music')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
                <SoundGroup title="Ambience" sounds={soundsByType('Ambience')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
                <SoundGroup title="One-shots" sounds={soundsByType('One-shots')} selectedIds={selectedSoundIds} onToggle={handleToggleSound} />
            </div>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-8">
        <button type="button" onClick={onCancel} className="py-2 px-6 rounded-xl text-dnd-text/40 hover:text-dnd-text transition-colors font-bold uppercase tracking-widest text-xs">
          Cancel
        </button>
        <button onClick={handleSave} disabled={isSubmitting || !name.trim()} className="py-2 px-8 rounded-xl text-black bg-dnd-gold font-black uppercase tracking-widest hover:brightness-110 disabled:bg-white/10 disabled:text-dnd-text/40 shadow-lg transition-all">
          {isSubmitting ? 'Saving...' : 'Save Preset'}
        </button>
      </div>
    </div>
  );
};