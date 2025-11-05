
import React, { useState, useEffect } from 'react';
import { Sound, SoundType } from '../types';
import { X } from 'lucide-react';

interface EditSoundModalProps {
  isOpen: boolean;
  sound: Sound | null;
  onClose: () => void;
  onUpdateSound: (id: string, updates: Partial<Sound>) => Promise<void>;
}

export const EditSoundModal: React.FC<EditSoundModalProps> = ({ isOpen, sound, onClose, onUpdateSound }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SoundType>('Sound Effect');
  const [volume, setVolume] = useState(0.75);
  const [loop, setLoop] = useState(false);
  const [categoryTag, setCategoryTag] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sound) {
      setName(sound.name);
      setType(sound.type);
      setVolume(sound.volume);
      setLoop(sound.loop);
      setCategoryTag(sound.category_tag || '');
      setMoodTag(sound.mood_tag || '');
      setLocationTag(sound.location_tag || '');
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
      category_tag: type === 'Background Music' ? categoryTag || null : null,
      mood_tag: type === 'Background Music' ? moodTag || null : null,
      location_tag: type === 'Background Music' ? locationTag || null : null,
    });
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen || !sound) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 w-full max-w-md m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Sound</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">Sound Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"/>
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-300">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as SoundType)} className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
              <option>Background Music</option>
              <option>Ambience</option>
              <option>Sound Effect</option>
            </select>
          </div>
          {type !== 'Sound Effect' && (
            <div className="flex items-center">
              <input type="checkbox" id="loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-blue-500" />
              <label htmlFor="loop" className="ml-2 text-sm text-slate-300">Loop</label>
            </div>
          )}
           {type === 'Background Music' && (
             <div className="space-y-2">
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"/>
             </div>
          )}
          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-slate-300">Default Volume: {Math.round(volume * 100)}%</label>
            <input type="range" id="volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white bg-slate-600 hover:bg-slate-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-500">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
