
import React, { useState, useEffect, useRef } from 'react';
import { Scene, Sound, AtmosphereLevel } from '../types';
import { X, Plus, Trash2, Layers, AlertTriangle, Check, ArrowLeft, Search, Coffee, Shield, Zap, Globe, Play, StopCircle } from 'lucide-react';

interface SceneManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenes: Scene[];
  sounds: Sound[]; // Need all sounds to populate the editor
  onAddScene: (name: string) => Promise<void>;
  onRemoveScene: (id: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateSceneJoins: (sceneId: string, soundData: Array<{ sound_id: string; atmosphere: AtmosphereLevel[] }>) => Promise<void>;
}

const atmosphereConfig: { [key in AtmosphereLevel]: { icon: React.ReactNode; colorClass: string; activeClass: string; } } = {
  'Relaxed': { icon: <Coffee size={14} />, colorClass: 'text-green-500', activeClass: 'bg-green-600 border-green-500 text-white shadow-green-900/40' },
  'Neutral': { icon: <Shield size={14} />, colorClass: 'text-sky-500', activeClass: 'bg-sky-600 border-sky-500 text-white shadow-sky-900/40' },
  'Intense': { icon: <Zap size={14} />, colorClass: 'text-red-500', activeClass: 'bg-red-600 border-red-500 text-white shadow-red-900/40' },
};

const AtmosphereEditor: React.FC<{
    scene: Scene;
    sounds: Sound[];
    onBack: () => void;
    onSave: (soundData: Array<{ sound_id: string; atmosphere: AtmosphereLevel[] }>) => Promise<void>;
}> = ({ scene, sounds, onBack, onSave }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'All' | 'BGM' | 'Ambience'>('All');
    const [state, setState] = useState<Record<string, Set<AtmosphereLevel>>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    // Preview State
    const [previewId, setPreviewId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize state based on current scene connections
    useEffect(() => {
        const initialState: Record<string, Set<AtmosphereLevel>> = {};
        sounds.forEach(sound => {
            if (sound.type === 'One-shots') return; // Skip one-shots for atmosphere
            
            const sceneInfo = sound.scenes?.find(s => s.id === scene.id);
            if (sceneInfo?.atmosphere && sceneInfo.atmosphere.length > 0) {
                initialState[sound.id] = new Set(sceneInfo.atmosphere);
            }
        });
        setState(initialState);
    }, [scene, sounds]);
    
    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const togglePreview = (sound: Sound) => {
        if (previewId === sound.id) {
            audioRef.current?.pause();
            audioRef.current = null;
            setPreviewId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (sound.publicURL) {
                const audio = new Audio(sound.publicURL);
                audio.volume = Math.min(sound.volume, 1);
                audio.onended = () => setPreviewId(null);
                audio.play().catch(e => console.error("Preview error:", e));
                audioRef.current = audio;
                setPreviewId(sound.id);
            }
        }
    };

    const handleToggle = (soundId: string, level: AtmosphereLevel) => {
        setState(prev => {
            const next = { ...prev };
            const currentSet = next[soundId] ? new Set(next[soundId]) : new Set<AtmosphereLevel>();
            
            if (currentSet.has(level)) {
                currentSet.delete(level);
            } else {
                currentSet.add(level);
            }
            
            if (currentSet.size === 0) {
                delete next[soundId];
            } else {
                next[soundId] = currentSet;
            }
            return next;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setPreviewId(null);
        }
        const payload = Object.entries(state).map(([soundId, set]) => ({
            sound_id: soundId,
            atmosphere: Array.from(set as Set<AtmosphereLevel>)
        }));
        await onSave(payload);
        setIsSaving(false);
        onBack();
    };

    const filteredSounds = sounds
        .filter(s => s.type !== 'One-shots')
        .filter(s => filter === 'All' || (filter === 'BGM' && s.type === 'Background Music') || (filter === 'Ambience' && s.type === 'Ambience'))
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            // Sort by: Active in this scene -> Name
            const aActive = !!state[a.id];
            const bActive = !!state[b.id];
            if (aActive !== bActive) return aActive ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="flex flex-col flex-grow min-h-0">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-stone-700/50">
                <button onClick={onBack} className="p-2 hover:bg-stone-700 rounded-full text-stone-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h3 className="text-xl font-medieval font-bold text-white leading-none">Edit Atmosphere</h3>
                    <p className="text-stone-400 text-sm">Scene: <span className="text-amber-400">{scene.name}</span></p>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search sounds..."
                        className="w-full bg-stone-800/40 border border-stone-600/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-amber-500 outline-none transition-colors"
                    />
                </div>
                <select 
                    value={filter} 
                    onChange={e => setFilter(e.target.value as any)}
                    className="bg-stone-800/40 border border-stone-600/50 rounded-xl px-3 text-sm text-stone-300 focus:border-amber-500 outline-none"
                >
                    <option value="All">All Types</option>
                    <option value="BGM">Music</option>
                    <option value="Ambience">Ambience</option>
                </select>
            </div>
            
            {/* Adjusted grid to include Preview column */}
            <div className="grid grid-cols-[3rem_2fr_repeat(3,1fr)] gap-3 mb-2 px-2 text-xs font-bold text-stone-500 uppercase tracking-wider text-center items-center">
                <div>Preview</div>
                <div className="text-left">Sound</div>
                <div>Relaxed</div>
                <div>Neutral</div>
                <div>Intense</div>
            </div>

            <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredSounds.map(sound => {
                    const activeLevels = state[sound.id] || new Set();
                    return (
                        <div key={sound.id} className={`grid grid-cols-[3rem_2fr_repeat(3,1fr)] gap-3 items-center p-2 rounded-lg border transition-colors ${activeLevels.size > 0 ? 'bg-stone-800/60 border-stone-700' : 'border-transparent hover:bg-stone-800/30'}`}>
                            
                            <div className="flex justify-center">
                                <button 
                                    onClick={() => togglePreview(sound)}
                                    className={`p-2 rounded-full transition-colors ${previewId === sound.id ? 'text-amber-400 bg-stone-700' : 'text-stone-500 hover:text-amber-400 hover:bg-stone-700/50'}`}
                                    title={previewId === sound.id ? "Stop Preview" : "Play Preview"}
                                >
                                    {previewId === sound.id ? <StopCircle size={20} /> : <Play size={20} />}
                                </button>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-200 truncate" title={sound.name}>{sound.name}</p>
                                <div className="flex items-center gap-1">
                                     <span className="text-[10px] text-stone-500 uppercase">{sound.type === 'Background Music' ? 'Music' : 'Ambience'}</span>
                                     {/* FIX: Removed title attribute from Globe component as it is not a valid prop for Lucide components */}
                                     {sound.include_in_all_scenes && <Globe size={10} className="text-sky-400/70" />}
                                </div>
                            </div>
                            
                            {(['Relaxed', 'Neutral', 'Intense'] as AtmosphereLevel[]).map(level => {
                                const isActive = activeLevels.has(level);
                                const config = atmosphereConfig[level];
                                return (
                                    <div key={level} className="flex justify-center">
                                        <button
                                            onClick={() => handleToggle(sound.id, level)}
                                            className={`w-full max-w-[60px] h-8 rounded-md flex items-center justify-center transition-all border ${isActive ? config.activeClass : 'bg-stone-900/50 border-stone-700 text-stone-600 hover:border-stone-500 hover:text-stone-400'}`}
                                            title={`Toggle ${level} for ${sound.name}`}
                                        >
                                            {config.icon}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
                {filteredSounds.length === 0 && <p className="text-center text-stone-500 py-8">No matching sounds found.</p>}
            </div>

            <div className="mt-4 flex justify-end pt-4 border-t border-stone-700/30">
                <button onClick={handleSave} disabled={isSaving} className="py-2 px-6 rounded-xl text-white bg-amber-600 hover:bg-amber-500 disabled:bg-stone-600 shadow-lg hover:shadow-amber-900/20 transition-all flex items-center gap-2">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export const SceneManagerModal: React.FC<SceneManagerModalProps> = ({
  isOpen,
  onClose,
  scenes,
  sounds,
  onAddScene,
  onRemoveScene,
  onUpdateSceneJoins,
}) => {
  const [newSceneName, setNewSceneName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  
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
      if (!isOpen) setEditingScene(null);
  }, [isOpen]);

  if (!showModal) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    
    if (scenes.some(s => s.name.toLowerCase() === newSceneName.trim().toLowerCase())) {
        setError('A scene with this name already exists.');
        return;
    }

    setIsSubmitting(true);
    setError(null);
    await onAddScene(newSceneName);
    setNewSceneName('');
    setIsSubmitting(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (confirmDeleteId === id) {
          executeDelete(id);
      } else {
          setConfirmDeleteId(id);
      }
  };

  const executeDelete = async (id: string) => {
      setError(null);
      const result = await onRemoveScene(id);
      if (!result.success) {
          setError(result.error || "Failed to delete scene.");
      }
      setConfirmDeleteId(null);
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setConfirmDeleteId(null);
  };

  const handleClose = () => {
      setConfirmDeleteId(null);
      setError(null);
      setEditingScene(null);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 bg-stone-950/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      <div 
        className={`relative bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl p-6 w-full m-4 h-[85vh] flex flex-col transition-all duration-300 ${editingScene ? 'max-w-4xl' : 'max-w-2xl'} ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}
        onClick={() => setConfirmDeleteId(null)}
      >
        {!editingScene ? (
            // LIST VIEW
            <>
                <div className="flex justify-between items-center mb-6" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-medieval font-bold text-white flex items-center gap-2 drop-shadow-sm">
                        <Layers className="text-amber-500" size={24} /> Manage Scenes
                    </h2>
                    <button onClick={handleClose} className="p-2 text-stone-400 hover:text-white hover:bg-stone-700/50 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleAdd} className="mb-6" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newSceneName}
                            onChange={(e) => setNewSceneName(e.target.value)}
                            placeholder="New Scene Name"
                            className="flex-1 bg-stone-800/40 border border-stone-600/50 rounded-xl p-3 text-white placeholder-stone-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !newSceneName.trim()}
                            className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-xl disabled:bg-stone-700 disabled:text-stone-500 transition-all shadow-lg hover:shadow-amber-900/20"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm mt-3 bg-red-900/20 p-3 rounded-lg border border-red-800/50 animate-pulse">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                    )}
                </form>

                <div className="flex-grow min-h-0 overflow-y-auto bg-stone-900/30 rounded-xl border border-stone-700/30 p-2 custom-scrollbar" onClick={e => e.stopPropagation()}>
                    {scenes.length === 0 ? (
                        <p className="text-stone-500 text-center py-8 italic">No scenes created yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {scenes.map(scene => {
                                const isConfirming = confirmDeleteId === scene.id;
                                return (
                                    <li 
                                        key={scene.id} 
                                        className={`flex justify-between items-center p-3 rounded-lg transition-all duration-200 border ${isConfirming ? 'bg-red-900/10 border-red-900/30' : 'bg-stone-800/50 border-transparent hover:bg-stone-700/50 hover:border-stone-600/50'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className={`font-medium truncate transition-colors ${isConfirming ? 'text-red-200' : 'text-stone-200'}`}>
                                                {scene.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {!isConfirming && (
                                                <button
                                                    onClick={() => setEditingScene(scene)}
                                                    className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-sky-500 hover:text-white hover:bg-sky-600 hover:border-sky-500 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <Layers size={14} /> Atmosphere
                                                </button>
                                            )}

                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteClick(e, scene.id)}
                                                className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm ${
                                                    isConfirming 
                                                    ? "bg-red-600 text-white hover:bg-red-500 hover:shadow-red-900/30 scale-105" 
                                                    : "text-stone-400 hover:text-red-400 hover:bg-stone-700 bg-stone-800 border border-stone-700"
                                                }`}
                                            >
                                                {isConfirming ? (
                                                    <>
                                                        <Check size={16} strokeWidth={3} />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Confirm</span>
                                                    </>
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                            
                                            {isConfirming && (
                                                <button
                                                    type="button"
                                                    onClick={cancelDelete}
                                                    className="text-stone-400 hover:text-stone-200 p-1.5 hover:bg-stone-700 rounded-lg transition-colors"
                                                    title="Cancel"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="mt-6 flex justify-end" onClick={e => e.stopPropagation()}>
                    <button onClick={handleClose} className="py-2 px-6 rounded-xl text-stone-300 hover:text-white bg-stone-700 hover:bg-stone-600 transition-all">Close</button>
                </div>
            </>
        ) : (
            // EDITOR VIEW
            <AtmosphereEditor 
                scene={editingScene} 
                sounds={sounds}
                onBack={() => setEditingScene(null)}
                onSave={async (data) => {
                   await onUpdateSceneJoins(editingScene.id, data);
                }}
            />
        )}
      </div>
    </div>
  );
};
