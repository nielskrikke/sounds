import React, { useState } from 'react';
import { Sound, SoundType, AtmosphereLevel, Scene } from '../types';
import { X } from 'lucide-react';

interface AddSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSound: (file: File, details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes' | 'atmosphere' | 'favorite'> & { sceneNames: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null>, favorite: boolean }) => Promise<void>;
  allScenes: Scene[];
}

const atmosphereLevels: AtmosphereLevel[] = ['Relaxed', 'Neutral', 'Combat'];

export const AddSoundModal: React.FC<AddSoundModalProps> = ({ isOpen, onClose, onAddSound, allScenes }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<SoundType>('One-shots');
  const [volume, setVolume] = useState(0.75);
  const [loop, setLoop] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [includeInAllScenes, setIncludeInAllScenes] = useState(false);
  const [categoryTag, setCategoryTag] = useState('');
  const [moodTag, setMoodTag] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [typeTag, setTypeTag] = useState('');
  const [scenes, setScenes] = useState('');
  const [atmosphere, setAtmosphere] = useState<AtmosphereLevel[]>([]);
  const [sceneAtmospheres, setSceneAtmospheres] = useState<Record<string, AtmosphereLevel[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAtmosphereChange = (level: AtmosphereLevel) => {
    setAtmosphere(prev => 
      prev.includes(level) 
        ? prev.filter(item => item !== level)
        : [...prev, level]
    );
  };

  const handleSceneAtmosphereChange = (sceneName: string, level: AtmosphereLevel) => {
    setSceneAtmospheres(prev => {
      const currentLevels = prev[sceneName] || [];
      const newLevels = currentLevels.includes(level)
        ? currentLevels.filter(l => l !== level)
        : [...currentLevels, level];
      return { ...prev, [sceneName]: newLevels };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a sound file.');
      return;
    }
    setIsSubmitting(true);
    
    const sceneNames = includeInAllScenes ? [] : scenes.split(',').map(s => s.trim()).filter(Boolean);
    const finalAtmospheres: Record<string, AtmosphereLevel[] | null> = {};

    if (type === 'Background Music' || type === 'Ambience') {
        if (includeInAllScenes) {
            Object.assign(finalAtmospheres, sceneAtmospheres);
        } else {
            sceneNames.forEach(name => {
                finalAtmospheres[name] = atmosphere;
            });
        }
    }

    await onAddSound(file, { 
      name: name || file.name.replace(/\.[^/.]+$/, ""), 
      type, 
      volume, 
      loop: type === 'One-shots' ? false : loop,
      favorite,
      include_in_all_scenes: includeInAllScenes,
      category_tag: type === 'Background Music' ? categoryTag || null : null,
      mood_tag: type === 'Background Music' ? moodTag || null : null,
      location_tag: type === 'Background Music' ? locationTag || null : null,
      type_tag: type === 'One-shots' ? typeTag || null : null,
      sceneNames: sceneNames,
      sceneAtmospheres: finalAtmospheres,
    });

    setIsSubmitting(false);
    onClose();
    // Reset form
    setFile(null);
    setName('');
    setType('One-shots');
    setVolume(0.75);
    setLoop(false);
    setFavorite(false);
    setIncludeInAllScenes(false);
    setCategoryTag('');
    setMoodTag('');
    setLocationTag('');
    setTypeTag('');
    setScenes('');
    setAtmosphere([]);
    setSceneAtmospheres({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-stone-800 rounded-lg p-8 w-full max-w-md m-4 overflow-y-auto max-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white">Add New Sound</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Sound File</label>
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="block w-full text-sm text-stone-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-600 file:text-stone-900 hover:file:bg-amber-500"/>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-300">Sound Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={file?.name.replace(/\.[^/.]+$/, "") || "Enter name"} className="mt-1 block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="includeInAllScenes" checked={includeInAllScenes} onChange={(e) => setIncludeInAllScenes(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
            <label htmlFor="includeInAllScenes" className="ml-2 text-sm text-stone-300">Include in all scenes</label>
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
              <option>One-shots</option>
            </select>
          </div>
          <div className="flex items-center gap-x-6">
            {type !== 'One-shots' && (
              <div className="flex items-center">
                <input type="checkbox" id="loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
                <label htmlFor="loop" className="ml-2 text-sm text-stone-300">Loop</label>
              </div>
            )}
            <div className="flex items-center">
              <input type="checkbox" id="favorite" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
              <label htmlFor="favorite" className="ml-2 text-sm text-stone-300">Favorite</label>
            </div>
          </div>
           {(type === 'Background Music' || type === 'Ambience') && !includeInAllScenes && scenes.trim().length > 0 && (
              <div>
                  <label className="block text-sm font-medium text-stone-300">Atmosphere Levels (for new scenes)</label>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      {atmosphereLevels.map(level => (
                          <label key={level} className="flex items-center text-sm text-stone-300">
                              <input 
                                  type="checkbox" 
                                  checked={atmosphere.includes(level)} 
                                  onChange={() => handleAtmosphereChange(level)}
                                  className="h-4 w-4 rounded accent-amber-500"
                              />
                              <span className="ml-2">{level}</span>
                          </label>
                      ))}
                  </div>
              </div>
          )}
          {(type === 'Background Music' || type === 'Ambience') && includeInAllScenes && allScenes.length > 0 && (
             <div className="space-y-3 p-3 bg-stone-900/50 rounded-md max-h-48 overflow-y-auto">
                  <label className="block text-sm font-medium text-stone-300">Atmosphere Levels (Per Scene)</label>
                  {allScenes.map(scene => (
                      <div key={scene.id}>
                          <p className="font-semibold text-sm text-amber-400">{scene.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              {atmosphereLevels.map(level => (
                                  <label key={level} className="flex items-center text-sm text-stone-300">
                                      <input 
                                          type="checkbox" 
                                          checked={(sceneAtmospheres[scene.name] || []).includes(level)} 
                                          onChange={() => handleSceneAtmosphereChange(scene.name, level)}
                                          className="h-4 w-4 rounded accent-amber-500"
                                      />
                                      <span className="ml-1.5">{level}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>
          )}
          {type === 'Background Music' && (
             <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-stone-300">Optional Tags for Filtering</p>
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
             </div>
          )}
          {type === 'One-shots' && (
            <div className="space-y-2">
              <input type="text" value={typeTag} onChange={e => setTypeTag(e.target.value)} placeholder="Type Tag (e.g., Sword, Magic)" className="block w-full bg-stone-700 border border-stone-600 rounded-md p-2 text-white"/>
            </div>
          )}
          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-stone-300">Default Volume: {Math.round(volume * 100)}%</label>
            <input type="range" id="volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-md text-white bg-stone-600 hover:bg-stone-500">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="py-2 px-4 rounded-md text-white bg-amber-600 hover:bg-amber-500 disabled:bg-stone-500 disabled:cursor-not-allowed">
              {isSubmitting ? 'Uploading...' : 'Add Sound'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};