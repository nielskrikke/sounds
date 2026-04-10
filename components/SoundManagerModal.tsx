
import React, { useState, useEffect, useRef } from 'react';
import { Sound, SoundType, AtmosphereLevel, Scene } from '../types';
import { X, Edit, Trash2, Plus, AlertTriangle, ArrowLeft, Play, Pause, Globe } from 'lucide-react';

interface SoundManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sounds: Sound[];
  allScenes: Scene[];
  onAddSound: (file: File, details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes' | 'atmosphere' | 'favorite'> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null>, favorite: boolean }) => Promise<void>;
  onUpdateSound: (id: string, updates: Partial<Omit<Sound, 'scenes'>> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null> }) => Promise<void>;
  onDeleteSound: (sound: Sound) => void;
}

const atmosphereLevels: AtmosphereLevel[] = ['Relaxed', 'Neutral', 'Intense'];

// --- Sub-Components ---

const SoundListSection: React.FC<{
  title: string;
  sounds: Sound[];
  onEditSound: (sound: Sound) => void;
  onDeleteSound: (sound: Sound) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
}> = ({ title, sounds, onEditSound, onDeleteSound, confirmDeleteId, setConfirmDeleteId }) => {
  if (sounds.length === 0) return null;

  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-xl font-serif font-bold text-dnd-gold mb-2 py-2">{title}</h3>
      <ul className="space-y-2">
        {sounds.map(sound => {
          const isConfirming = confirmDeleteId === sound.id;
          return (
            <li key={sound.id} className="flex justify-between items-center bg-black/40 hover:bg-white/5 border border-white/5 p-3 rounded-xl group min-h-[4.5rem] transition-all duration-200">
              <div className="truncate pr-4 flex-grow">
                <p className="text-dnd-text font-medium truncate">{sound.name}</p>
                <div className="flex items-center gap-2 text-xs text-dnd-text/40 truncate mt-0.5">
                    {sound.include_in_all_scenes && <Globe size={12} className="text-dnd-gold/60" />}
                    <span>Scenes: {sound.include_in_all_scenes ? 'All' : sound.scenes?.map(s => s.name).join(', ') || 'None'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isConfirming && (
                   <button onClick={() => onEditSound(sound)} className="p-2 text-dnd-text/40 hover:text-dnd-gold rounded-full hover:bg-white/5 transition-colors" aria-label={`Edit ${sound.name}`}>
                      <Edit size={18} />
                    </button>
                )}
                <button 
                    onClick={() => {
                        if (isConfirming) {
                            onDeleteSound(sound);
                            setConfirmDeleteId(null);
                        } else {
                            setConfirmDeleteId(sound.id);
                        }
                    }}
                    className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                        isConfirming 
                        ? "bg-dnd-red text-white hover:brightness-110 px-4 py-2 w-auto rounded-md animate-pulse" 
                        : "text-dnd-red/60 hover:text-dnd-red hover:bg-white/5"
                    }`}
                    aria-label={isConfirming ? "Confirm Delete" : "Delete Sound"}
                >
                  {isConfirming ? (
                      <>
                        <AlertTriangle size={16} />
                        <span className="text-sm font-bold whitespace-nowrap">Confirm Delete</span>
                      </>
                  ) : (
                      <Trash2 size={18} />
                  )}
                </button>
                {isConfirming && (
                    <button 
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-2 text-dnd-text/40 hover:text-dnd-gold rounded-full hover:bg-white/5 transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const AddSoundForm: React.FC<{
    allScenes: Scene[];
    onClose: () => void;
    onAddSound: (file: File, details: any) => Promise<void>;
}> = ({ allScenes, onClose, onAddSound }) => {
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
    
    const [globalAtmosphere, setGlobalAtmosphere] = useState<AtmosphereLevel[]>([]);
    const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
    const [sceneAtmospheres, setSceneAtmospheres] = useState<Record<string, AtmosphereLevel[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (includeInAllScenes) {
            setSelectedSceneIds(new Set(allScenes.map(s => s.id)));
        }
    }, [includeInAllScenes, allScenes]);
  
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
      if (!file) {
        alert('Please select a sound file.');
        return;
      }
      setIsSubmitting(true);
      
      const finalSceneIds = Array.from(selectedSceneIds) as string[];
      const finalAtmospheres: Record<string, AtmosphereLevel[] | null> = {};
  
      if (type === 'Background Music' || type === 'Ambience') {
          finalSceneIds.forEach(id => {
              if (includeInAllScenes) {
                  finalAtmospheres[id] = globalAtmosphere;
              } else {
                  finalAtmospheres[id] = sceneAtmospheres[id] || [];
              }
          });
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
        sceneIds: finalSceneIds,
        sceneAtmospheres: finalAtmospheres,
      });
  
      setIsSubmitting(false);
      onClose();
    };

    const scenesToConfigure = allScenes.filter(s => selectedSceneIds.has(s.id));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Sound File</label>
            <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="block w-full text-sm text-dnd-text/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-dnd-gold file:text-black hover:file:brightness-110 file:transition-all cursor-pointer bg-black/40 rounded-xl border border-white/5"/>
            </div>
            <div>
            <label htmlFor="name" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-1">Sound Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={file?.name.replace(/\.[^/.]+$/, "") || "Enter name"} className="mt-1 block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold outline-none transition-all"/>
            </div>
            
            <div>
            <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Scenes</label>
            <div className="flex items-center mb-3">
                <input type="checkbox" id="includeInAllScenes" checked={includeInAllScenes} onChange={(e) => setIncludeInAllScenes(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="includeInAllScenes" className="ml-2 text-sm text-dnd-gold font-bold uppercase tracking-wider">Include in all scenes</label>
            </div>

            {includeInAllScenes && (type === 'Background Music' || type === 'Ambience') && (
                <div className="mb-3 p-3 bg-black/40 rounded-xl border border-white/5">
                    <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-3">Global Atmosphere Levels (Default)</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {atmosphereLevels.map(level => (
                            <label key={level} className="flex items-center text-sm text-dnd-text/60 cursor-pointer hover:text-dnd-gold transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={globalAtmosphere.includes(level)} 
                                    onChange={() => handleGlobalAtmosphereChange(level)}
                                    className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10"
                                />
                                <span className="ml-1.5">{level}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-black/40 border border-white/5 rounded-xl p-3 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                {allScenes.map(scene => (
                    <label key={scene.id} className={`flex items-center text-sm text-dnd-text/60 ${includeInAllScenes ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:text-dnd-gold transition-colors'}`}>
                        <input 
                            type="checkbox" 
                            checked={selectedSceneIds.has(scene.id)}
                            onChange={() => handleSceneToggle(scene.id)}
                            disabled={includeInAllScenes}
                            className="h-3 w-3 rounded accent-dnd-gold mr-2 bg-black/40 border-white/10"
                        />
                        <span className="truncate">{scene.name}</span>
                    </label>
                ))}
                {allScenes.length === 0 && <p className="text-xs text-dnd-text/20 col-span-2 text-center italic">No scenes available. Create one first.</p>}
            </div>
            </div>

            <div>
            <label htmlFor="type" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-1">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as SoundType)} className="mt-1 block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text focus:border-dnd-gold outline-none">
                <option>Background Music</option>
                <option>Ambience</option>
                <option>One-shots</option>
            </select>
            </div>
            <div className="flex items-center gap-x-6">
            {type !== 'One-shots' && (
                <div className="flex items-center">
                <input type="checkbox" id="loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="loop" className="ml-2 text-sm text-dnd-text/60">Loop</label>
                </div>
            )}
            <div className="flex items-center">
                <input type="checkbox" id="favorite" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="favorite" className="ml-2 text-sm text-dnd-text/60">Favorite</label>
            </div>
            </div>
            
            {(type === 'Background Music' || type === 'Ambience') && scenesToConfigure.length > 0 && (
                <div className="space-y-3 p-3 bg-black/40 rounded-xl max-h-48 overflow-y-auto border border-white/5 custom-scrollbar">
                    <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40">Atmosphere Levels (Per Scene)</label>
                    {scenesToConfigure.map(scene => (
                        <div key={scene.id} className="border-t border-white/5 pt-2 first:border-0 first:pt-0">
                            <p className="font-bold text-xs text-dnd-gold uppercase tracking-wider mb-1">{scene.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {atmosphereLevels.map(level => (
                                    <label key={level} className="flex items-center text-sm text-dnd-text/60 hover:text-dnd-text cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={(sceneAtmospheres[scene.id] || []).includes(level)} 
                                            onChange={() => handleSceneAtmosphereChange(scene.id, level)}
                                            className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10"
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
                <div className="space-y-3 pt-2">
                <p className="text-xs font-black uppercase tracking-widest text-dnd-text/40">Optional Tags for Filtering</p>
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                </div>
            )}
            {type === 'One-shots' && (
            <div className="space-y-3">
                <input type="text" value={typeTag} onChange={e => setTypeTag(e.target.value)} placeholder="Type Tag (e.g., Sword, Magic)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
            </div>
            )}
            <div>
            <label htmlFor="volume" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Default Volume: {Math.round(volume * 100)}%</label>
            <input type="range" id="volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-dnd-gold" />
            </div>
            <div className="flex justify-end gap-4 pt-6">
            <button type="submit" disabled={isSubmitting} className="py-2 px-8 rounded-xl text-black bg-dnd-gold font-black uppercase tracking-widest hover:brightness-110 disabled:bg-white/10 disabled:text-dnd-text/40 disabled:cursor-not-allowed shadow-lg transition-all">
                {isSubmitting ? 'Uploading...' : 'Add Sound'}
            </button>
            </div>
        </form>
    );
};

const EditSoundForm: React.FC<{
    sound: Sound;
    allScenes: Scene[];
    onClose: () => void;
    onUpdateSound: (id: string, updates: any) => Promise<void>;
}> = ({ sound, allScenes, onClose, onUpdateSound }) => {
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

    // Audio Preview Logic
    useEffect(() => {
        if (!sound?.publicURL) return;
        
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
        };
    }, [sound]);

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
        setIsSubmitting(true);
        
        const finalSceneIds = Array.from(selectedSceneIds) as string[];
        const finalAtmospheres: Record<string, AtmosphereLevel[] | null> = {};
    
        if (type === 'Background Music' || type === 'Ambience') {
            finalSceneIds.forEach(id => {
                if (includeInAllScenes) {
                    finalAtmospheres[id] = globalAtmosphere;
                } else {
                    finalAtmospheres[id] = sceneAtmospheres[id] || [];
                }
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
        });
        setIsSubmitting(false);
        onClose();
    };

    const scenesToConfigure = allScenes.filter(s => selectedSceneIds.has(s.id));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label htmlFor="edit-name" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-1">Sound Name</label>
            <input type="text" id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold outline-none transition-all"/>
            </div>
            
            <div>
            <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Scenes</label>
            <div className="flex items-center mb-3">
                <input type="checkbox" id="editIncludeInAllScenes" checked={includeInAllScenes} onChange={(e) => setIncludeInAllScenes(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="editIncludeInAllScenes" className="ml-2 text-sm text-dnd-gold font-bold uppercase tracking-wider">Include in all scenes</label>
            </div>

            {includeInAllScenes && (type === 'Background Music' || type === 'Ambience') && (
                <div className="mb-3 p-3 bg-black/40 rounded-xl border border-white/5">
                    <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-3">Global Atmosphere Levels (Default)</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {atmosphereLevels.map(level => (
                            <label key={level} className="flex items-center text-sm text-dnd-text/60 cursor-pointer hover:text-dnd-gold transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={globalAtmosphere.includes(level)} 
                                    onChange={() => handleGlobalAtmosphereChange(level)}
                                    className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10"
                                />
                                <span className="ml-1.5">{level}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-black/40 border border-white/5 rounded-xl p-3 max-h-32 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                {allScenes.map(scene => (
                    <label key={scene.id} className={`flex items-center text-sm text-dnd-text/60 ${includeInAllScenes ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:text-dnd-gold transition-colors'}`}>
                        <input 
                            type="checkbox" 
                            checked={selectedSceneIds.has(scene.id)}
                            onChange={() => handleSceneToggle(scene.id)}
                            disabled={includeInAllScenes}
                            className="h-3 w-3 rounded accent-dnd-gold mr-2 bg-black/40 border-white/10"
                        />
                        <span className="truncate">{scene.name}</span>
                    </label>
                ))}
                {allScenes.length === 0 && <p className="text-xs text-dnd-text/20 col-span-2 text-center italic">No scenes available. Create one first.</p>}
            </div>
            </div>
            
            <div>
            <label htmlFor="edit-type" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-1">Type</label>
            <select id="edit-type" value={type} onChange={(e) => setType(e.target.value as SoundType)} className="mt-1 block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text focus:border-dnd-gold outline-none">
                <option>Background Music</option>
                <option>Ambience</option>
                <option>One-shots</option>
            </select>
            </div>
            <div className="flex items-center gap-x-6">
            {type !== 'One-shots' && (
                <div className="flex items-center">
                <input type="checkbox" id="edit-loop" checked={loop} onChange={(e) => setLoop(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="edit-loop" className="ml-2 text-sm text-dnd-text/60">Loop</label>
                </div>
            )}
            <div className="flex items-center">
                <input type="checkbox" id="edit-favorite" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10" />
                <label htmlFor="edit-favorite" className="ml-2 text-sm text-dnd-text/60">Favorite</label>
            </div>
            </div>
            
            {(type === 'Background Music' || type === 'Ambience') && scenesToConfigure.length > 0 && (
                <div className="space-y-3 p-3 bg-black/40 rounded-xl max-h-48 overflow-y-auto border border-white/5 custom-scrollbar">
                    <label className="block text-xs font-black uppercase tracking-widest text-dnd-text/40">Atmosphere Levels (Per Scene)</label>
                    {scenesToConfigure.map(scene => (
                        <div key={scene.id} className="border-t border-white/5 pt-2 first:border-0 first:pt-0">
                            <p className="font-bold text-xs text-dnd-gold uppercase tracking-wider mb-1">{scene.name}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {atmosphereLevels.map(level => (
                                    <label key={level} className="flex items-center text-sm text-dnd-text/60 hover:text-dnd-text cursor-pointer transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={(sceneAtmospheres[scene.id] || []).includes(level)} 
                                            onChange={() => handleSceneAtmosphereChange(scene.id, level)}
                                            className="h-4 w-4 rounded accent-dnd-gold bg-black/40 border-white/10"
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
                <div className="space-y-3 pt-2">
                <p className="text-xs font-black uppercase tracking-widest text-dnd-text/40">Optional Tags for Filtering</p>
                <input type="text" value={categoryTag} onChange={e => setCategoryTag(e.target.value)} placeholder="Category Tag (e.g., Combat)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                <input type="text" value={moodTag} onChange={e => setMoodTag(e.target.value)} placeholder="Mood Tag (e.g., Tense)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                <input type="text" value={locationTag} onChange={e => setLocationTag(e.target.value)} placeholder="Location Tag (e.g., Forest)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
                </div>
            )}
            {type === 'One-shots' && (
            <div className="space-y-3">
                <input type="text" value={typeTag} onChange={e => setTypeTag(e.target.value)} placeholder="Type Tag (e.g., Sword, Magic)" className="block w-full bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-all"/>
            </div>
            )}
            <div>
                <div className="flex items-center justify-between">
                <label htmlFor="edit-volume" className="block text-xs font-black uppercase tracking-widest text-dnd-text/40 mb-2">Default Volume: {Math.round(volume * 100)}%</label>
                    <button
                    type="button"
                    onClick={handlePreviewToggle}
                    className="p-2 rounded-full text-dnd-text/40 hover:bg-white/5 hover:text-dnd-gold transition-colors"
                    aria-label={isPreviewing ? "Pause preview" : "Play preview"}
                >
                    {isPreviewing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                </div>
            <input type="range" id="edit-volume" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-dnd-gold mt-2" />
            </div>
            <div className="flex justify-end gap-4 pt-4">
            <button type="submit" disabled={isSubmitting} className="py-2 px-8 rounded-xl text-black bg-dnd-gold font-black uppercase tracking-widest hover:brightness-110 disabled:bg-white/10 disabled:text-dnd-text/40 shadow-lg transition-all">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            </div>
        </form>
    );
};

// --- Main Modal ---

export const SoundManagerModal: React.FC<SoundManagerModalProps> = ({
  isOpen,
  onClose,
  sounds,
  allScenes,
  onAddSound,
  onUpdateSound,
  onDeleteSound,
}) => {
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingSound, setEditingSound] = useState<Sound | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
      if (isOpen) {
          setShowModal(true);
      } else {
          const timer = setTimeout(() => {
              setShowModal(false);
              setView('list'); // Reset view on close
              setEditingSound(null);
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  if (!showModal) return null;

  const ambienceSounds = sounds.filter(s => s.type === 'Ambience');
  const bgmSounds = sounds.filter(s => s.type === 'Background Music');
  const sfxSounds = sounds.filter(s => s.type === 'One-shots');

  const handleClose = () => {
      setConfirmDeleteId(null);
      setEditingSound(null);
      onClose();
  }

  const handleBackToList = () => {
      setView('list');
      setEditingSound(null);
  }

  const containerClasses = `relative bg-dnd-panel/80 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl p-8 m-4 flex flex-col transition-all duration-300 ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`;
  
  // Dynamic width/height styles based on view
  const viewStyles = view === 'list' 
      ? "w-full max-w-2xl max-h-[85vh]" // Reduced slightly to ensure headers/footers fit on smaller screens
      : "w-full max-w-lg max-h-[85vh]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div className={`${containerClasses} ${viewStyles}`}>
        {view === 'list' && (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-serif font-bold text-dnd-text drop-shadow-sm">Manage Sounds</h2>
                    <button onClick={handleClose} className="text-dnd-text/40 hover:text-dnd-gold transition-colors p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
                </div>

                <div className="flex justify-end mb-4">
                    <button onClick={() => setView('add')} className="flex items-center gap-2 py-2 px-6 rounded-xl text-black bg-dnd-gold font-black uppercase tracking-widest hover:brightness-110 shadow-lg transition-all">
                        <Plus size={16}/> Add New Sound
                    </button>
                </div>

                <div className="flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar" onClick={(e) => {
                    if (e.target === e.currentTarget) setConfirmDeleteId(null);
                }}>
                    {sounds.length === 0 ? (
                        <p className="text-dnd-text/40 text-center py-8">Your sound library is empty. Add a sound to get started!</p>
                    ) : (
                        <div>
                        <SoundListSection 
                            title="Ambience" 
                            sounds={ambienceSounds} 
                            onEditSound={(s) => { setEditingSound(s); setView('edit'); }} 
                            onDeleteSound={onDeleteSound}
                            confirmDeleteId={confirmDeleteId}
                            setConfirmDeleteId={setConfirmDeleteId}
                        />
                        <SoundListSection 
                            title="Background Music" 
                            sounds={bgmSounds} 
                            onEditSound={(s) => { setEditingSound(s); setView('edit'); }} 
                            onDeleteSound={onDeleteSound}
                            confirmDeleteId={confirmDeleteId}
                            setConfirmDeleteId={setConfirmDeleteId}
                        />
                        <SoundListSection 
                            title="One-shots" 
                            sounds={sfxSounds} 
                            onEditSound={(s) => { setEditingSound(s); setView('edit'); }} 
                            onDeleteSound={onDeleteSound}
                            confirmDeleteId={confirmDeleteId}
                            setConfirmDeleteId={setConfirmDeleteId}
                        />
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-6">
                    <button onClick={handleClose} className="py-2 px-6 rounded-xl text-dnd-text/60 hover:text-dnd-gold hover:bg-white/5 transition-colors font-bold uppercase tracking-wider text-sm">Close</button>
                </div>
            </>
        )}

        {view === 'add' && (
             <div className="flex flex-col flex-grow min-h-0">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                         <button onClick={handleBackToList} className="p-2 text-dnd-text/40 hover:text-dnd-gold rounded-full hover:bg-white/5 transition-colors">
                             <ArrowLeft size={20} />
                         </button>
                         <h2 className="text-2xl font-serif font-bold text-dnd-text">Add New Sound</h2>
                    </div>
                    <button onClick={handleClose} className="text-dnd-text/40 hover:text-dnd-gold transition-colors p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
                </div>
                <div className="flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    <AddSoundForm 
                        allScenes={allScenes} 
                        onClose={handleBackToList} 
                        onAddSound={onAddSound} 
                    />
                </div>
             </div>
        )}

        {view === 'edit' && editingSound && (
             <div className="flex flex-col flex-grow min-h-0">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                         <button onClick={handleBackToList} className="p-2 text-dnd-text/40 hover:text-dnd-gold rounded-full hover:bg-white/5 transition-colors">
                             <ArrowLeft size={20} />
                         </button>
                         <h2 className="text-2xl font-serif font-bold text-dnd-text">Edit Sound</h2>
                    </div>
                    <button onClick={handleClose} className="text-dnd-text/40 hover:text-dnd-gold transition-colors p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
                </div>
                <div className="flex-grow min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                    <EditSoundForm 
                        sound={editingSound} 
                        allScenes={allScenes} 
                        onClose={handleBackToList} 
                        onUpdateSound={onUpdateSound} 
                    />
                </div>
             </div>
        )}

      </div>
    </div>
  );
};
