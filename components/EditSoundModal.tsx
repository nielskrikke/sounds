import React, { useState, useEffect } from 'react';
import { Sound, SoundType } from '../types';
import { X } from 'lucide-react';

interface EditSoundModalProps {
  isOpen: boolean;
  sound: Sound | null;
  onClose: () => void;
  onUpdateSound: (id: string, updates: Partial<Omit<Sound, 'scenes'>> & { sceneNames: string[] }) => Promise<void>;
}

export const EditSoundModal: React.FC<EditSoundModalProps> = ({ isOpen, sound, onClose, onUpdateSound }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SoundType>('Sound Effect');
  const [volume, setVolume] = useState(0.75);
  const [loop, setLoop] = useState(false);
  const [includeInAllScenes, setIncludeInAllScenes] = useState(false);
  const [categoryTag, setCategoryTag] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [scenes, setScenes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sound) {
      setName(sound.name);
      setType(sound.type);
      setVolume(sound.volume);
      setLoop(sound.loop);
      setIncludeInAllScenes(sound.include_in_all_scenes || false);
      setCategoryTag(sound.category_tag || '');
      setMoodTag(sound.mood_tag || '');
      setLocationTag(sound.location_tag || '');
      setScenes(sound.scenes?.map(s => s.name).join(', ') || '');
    }
  }, [sound]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sound) return;
    
    setIsSubmitting(true);
    await onUpdateSound(sound.id, {
      name,
      type,
      volume,
      loop: type === 'Sound Effect' ? false : loop,
      include_in_all_scenes: includeInAllScenes,
      category_tag: type === 'Background Music' ? categoryTag || null : null,
      mood_tag: type === 'Background Music' ? moodTag || null : null,
      location_tag: type === 'Background Music' ? locationTag || null : null,
      sceneNames: includeInAllScenes ? [] : scenes.split(',').map(s => s.trim()).filter(Boolean),
    });
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || !sound) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-stone-800 rounded-lg p-8 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white">Edit Sound</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-300">Sound Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="editIncludeInAllScenes" checked={includeInAllScenes} onChange={(e) => setIncludeInAllScenes(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
            <label htmlFor="editIncludeInAllScenes" className="ml-2 text-sm text-stone-300">Include in all scenes</label>
          </div>
          <div>
            <label htmlFor="scenes" className={`block text-sm font-medium ${includeInAllScenes ? 'text-stone-500' : 'text-stone-300'}`}>Scenes</label>
            <input type="text" id="scenes" value={scenes} onChange={(e) => setScenes(e.target.value)} placeholder="Combat, Tavern, Forest..." disabled={includeInAllScenes} className="mt-1 block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white disabled:bg-stone-900 disabled:cursor-not-allowed"/>
            <p className="text-xs text-stone-400 mt-1">Separate scene names with commas.</p>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-stone-300">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as SoundType)} className="mt-1 block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white">
              <option>Background Music</option>
              <option>Ambience</option>
              <option>Sound Effect</option>
            </select>
          </div>
          {type !== 'Sound Effect' && (
            <div className="flex items-center">
              <input type="checkbox" id="loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
              <label htmlFor="loop" className="ml-2 text-sm text-stone-300">Loop</label>
            </div>
          )}
           {type === 'Background Music' && (
             <div className="space-y-2">
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
             </div>
          )}
          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-stone-300">Default Volume: {Math.round(volume * 100)}%</label>
            <input type="range" id="volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white bg-stone-600 hover:bg-stone-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-md text-white bg-amber-600 hover:bg-amber-500 disabled:bg-stone-500">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};