
import React, { useState, useEffect, useRef } from 'react';
import { Sound, SoundType, AtmosphereLevel, Scene } from '../types';
import { X, Play, Pause } from 'lucide-react';

interface EditSoundModalProps {
  isOpen: boolean;
  sound: Sound | null;
  onClose: () => void;
  onUpdateSound: (id: string, updates: Partial<Omit<Sound, 'scenes'>> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null> }) => Promise<void>;
  allScenes: Scene[];
}

const atmosphereLevels: AtmosphereLevel[] = ['Relaxed', 'Neutral', 'Intense'];

export const EditSoundModal: React.FC<EditSoundModalProps> = ({ isOpen, sound, onClose, onUpdateSound, allScenes }) => {
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
  
  const [globalAtmosphere, setGlobalAtmosphere] = useState<AtmosphereLevel[]>([]);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
  const [sceneAtmospheres, setSceneAtmospheres] = useState<Record<string, AtmosphereLevel[]>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
      if (isOpen) {
          setShowModal(true);
      } else {
          const timer = setTimeout(() => setShowModal(false), 100);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  useEffect(() => {
    if (sound) {
      setName(sound.name);
      setType(sound.type);
      setVolume(sound.volume);
      setLoop(sound.loop);
      setFavorite(sound.favorite || false);
      setIncludeInAllScenes(sound.include_in_all_scenes || false);
      setCategoryTag(sound.category_tag || '');
      setMoodTag(sound.mood_tag || '');
      setLocationTag(sound.location_tag || '');
      setTypeTag(sound.type_tag || '');
      setGlobalAtmosphere(sound.atmosphere || []);
      
      const initialSceneIds = new Set<string>();
      const initialAtmospheres: Record<string, AtmosphereLevel[]> = {};
      
      if (sound.include_in_all_scenes) {
          allScenes.forEach(s => initialSceneIds.add(s.id));
      }

      sound.scenes?.forEach(scene => {
          initialSceneIds.add(scene.id);
          if (scene.atmosphere) {
              initialAtmospheres[scene.id] = scene.atmosphere;
          }
      });
      
      setSelectedSceneIds(initialSceneIds);
      setSceneAtmospheres(initialAtmospheres);
    }
  }, [sound, allScenes]);

  useEffect(() => {
    if (includeInAllScenes) {
         setSelectedSceneIds(new Set(allScenes.map(s => s.id)));
    }
  }, [includeInAllScenes, allScenes]);

  useEffect(() => {
    if (!isOpen || !sound?.publicURL) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setIsPreviewing(false);
      return;
    }

    const audio = new Audio(sound.publicURL);
    const onEnded = () => setIsPreviewing(false);
    audio.addEventListener('ended', onEnded);
    audioPreviewRef.current = audio;

    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.removeEventListener('ended', onEnded);
        audioPreviewRef.current = null;
      }
      setIsPreviewing(false);
    };
  }, [isOpen, sound]);

  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = volume;
    }
  }, [volume]);

  const handlePreviewToggle = () => {
    const audio = audioPreviewRef.current;
    if (!audio) return;

    if (isPreviewing) {
      audio.pause();
      setIsPreviewing(false);
    } else {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Audio preview failed:", e));
      setIsPreviewing(true);
    }
  };
  
  const handleSceneToggle = (sceneId: string) => {
      if (includeInAllScenes) return;
      setSelectedSceneIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(sceneId)) {
              newSet.delete(sceneId);
          } else {
              newSet.add(sceneId);
          }
          return newSet;
      });
  };

  const handleGlobalAtmosphereChange = (level: AtmosphereLevel) => {
      setGlobalAtmosphere(prev => 
          prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
      );
  };

  const handleSceneAtmosphereChange = (sceneId: string, level: AtmosphereLevel) => {
    setSceneAtmospheres(prev => {
      const currentLevels = prev[sceneId] || [];
      const newLevels = currentLevels.includes(level)
        ? currentLevels.filter(l => l !== level)
        : [...currentLevels, level];
      return { ...prev, [sceneId]: newLevels };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sound) return;
    
    setIsSubmitting(true);
    
    const finalSceneIds = Array.from(selectedSceneIds) as string[];
    const finalAtmospheres: Record<string, AtmosphereLevel[] | null> = {};

    if (type === 'Background Music' || type === 'Ambience') {
        finalSceneIds.forEach(id => {
            finalAtmospheres[id] = sceneAtmospheres[id] || [];
        });
    }

    await onUpdateSound(sound.id, {
      name,
      type,
      volume,
      loop: type === 'One-shots' ? false : loop,
      favorite,
      include_in_all_scenes: includeInAllScenes,
      category_tag: type === 'Background Music' ? categoryTag || null : null,
      mood_tag: type === 'Background Music' ? moodTag || null : null,
      location_tag: type === 'Background Music' ? locationTag || null : null,
      type_tag: type === 'One-shots' ? typeTag || null : null,
      sceneIds: finalSceneIds,
      sceneAtmospheres: finalAtmospheres,
      atmosphere: includeInAllScenes ? globalAtmosphere : null,
    });
    setIsSubmitting(false);
    onClose();
  };
  
  if (!showModal || !sound) return null;
  
  const scenesToConfigure = allScenes.filter(s => selectedSceneIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-md bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-8 m-4 overflow-y-auto max-h-[90vh] custom-scrollbar ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-medieval font-bold text-white drop-shadow-sm">Edit Sound</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-stone-700/50 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-stone-300">Sound Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"/>
          </div>
          
           <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">Scenes</label>
            <div className="flex items-center mb-2">
                <input type="checkbox" id="editIncludeInAllScenes" checked={includeInAllScenes} onChange={(e) => setIncludeInAllScenes(e.target.checked)} className="h-4 w-4 rounded accent-amber-500 bg-stone-700 border-stone-600" />
                <label htmlFor="editIncludeInAllScenes" className="ml-2 text-sm text-amber-400 font-medium">Include in all scenes</label>
            </div>

            {includeInAllScenes && (type === 'Background Music' || type === 'Ambience') && (
                <div className="mb-3 p-3 bg-stone-800/40 rounded-xl border border-stone-700/50">
                    <label className="block text-sm font-medium text-stone-300 mb-2">Global Atmosphere Levels (Default)</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {atmosphereLevels.map(level => (
                            <label key={level} className="flex items-center text-sm text-stone-300 cursor-pointer hover:text-white">
                                <input 
                                    type="checkbox" 
                                    checked={globalAtmosphere.includes(level)} 
                                    onChange={() => handleGlobalAtmosphereChange(level)}
                                    className="h-4 w-4 rounded accent-amber-500 bg-stone-700 border-stone-600"
                                />
                                <span className="ml-1.5">{level}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-stone-800/40 border border-stone-700/50 rounded-xl p-2 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                {allScenes.map(scene => (
                    <label key={scene.id} className={`flex items-center text-sm text-stone-300 ${includeInAllScenes ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:text-white'}`}>
                        <input 
                            type="checkbox" 
                            checked={selectedSceneIds.has(scene.id)}
                            onChange={() => handleSceneToggle(scene.id)}
                            disabled={includeInAllScenes}
                            className="h-3 w-3 rounded accent-amber-500 mr-2 bg-stone-600 border-stone-500"
                        />
                        {scene.name}
                    </label>
                ))}
                {allScenes.length === 0 && <p className="text-xs text-stone-500 col-span-2 text-center">No scenes available. Create one first.</p>}
            </div>
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-stone-300">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as SoundType)} className="mt-1 block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none">
              <option>Background Music</option>
              <option>Ambience</option>
              <option>One-shots</option>
            </select>
          </div>
          <div className="flex items-center gap-x-6">
            {type !== 'One-shots' && (
              <div className="flex items-center">
                <input type="checkbox" id="loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-amber-500 bg-stone-700 border-stone-600" />
                <label htmlFor="loop" className="ml-2 text-sm text-stone-300">Loop</label>
              </div>
            )}
            <div className="flex items-center">
              <input type="checkbox" id="edit-favorite" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 rounded accent-amber-500 bg-stone-700 border-stone-600" />
              <label htmlFor="edit-favorite" className="ml-2 text-sm text-stone-300">Favorite</label>
            </div>
          </div>
           
           {(type === 'Background Music' || type === 'Ambience') && scenesToConfigure.length > 0 && (
              <div className="space-y-3 p-3 bg-stone-800/40 rounded-xl max-h-48 overflow-y-auto border border-stone-700/50 custom-scrollbar">
                  <label className="block text-sm font-medium text-stone-300">Atmosphere Levels (Per Scene)</label>
                  {scenesToConfigure.map(scene => (
                      <div key={scene.id}>
                          <p className="font-semibold text-sm text-amber-400">{scene.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              {atmosphereLevels.map(level => (
                                  <label key={level} className="flex items-center text-sm text-stone-300">
                                      <input 
                                          type="checkbox" 
                                          checked={(sceneAtmospheres[scene.id] || []).includes(level)} 
                                          onChange={() => handleSceneAtmosphereChange(scene.id, level)}
                                          className="h-4 w-4 rounded accent-amber-500 bg-stone-700 border-stone-600"
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
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 outline-none"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 outline-none"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 outline-none"/>
             </div>
          )}
          {type === 'One-shots' && (
            <div className="space-y-2">
              <input type="text" value={typeTag} onChange={e => setTypeTag(e.target.value)} placeholder="Type Tag (e.g., Sword, Magic)" className="block w-full bg-stone-800/40 border border-stone-600/50 rounded-xl p-2 text-white focus:border-amber-500 outline-none"/>
            </div>
          )}
          <div>
             <div className="flex items-center justify-between">
                <label htmlFor="volume" className="block text-sm font-medium text-stone-300">Default Volume: {Math.round(volume * 100)}%</label>
                 <button
                    type="button"
                    onClick={handlePreviewToggle}
                    className="p-2 rounded-full text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
                    aria-label={isPreviewing ? "Pause preview" : "Play preview"}
                >
                    {isPreviewing ? <Pause size={18} /> : <Play size={18} />}
                </button>
             </div>
            <input type="range" id="volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500 mt-2" />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/50 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="py-2 px-6 rounded-xl text-white bg-amber-600 hover:bg-amber-500 disabled:bg-stone-500 shadow-lg hover:shadow-amber-900/20 transition-all">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
