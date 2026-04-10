
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
  'Relaxed': { icon: <Coffee size={14} />, colorClass: 'text-green-500', activeClass: 'bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]' },
  'Neutral': { icon: <Shield size={14} />, colorClass: 'text-dnd-gold', activeClass: 'bg-dnd-gold border-dnd-gold text-black shadow-[0_0_10px_rgba(201,173,106,0.4)]' },
  'Intense': { icon: <Zap size={14} />, colorClass: 'text-dnd-red', activeClass: 'bg-dnd-red border-dnd-red text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' },
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
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
                <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-dnd-text/40 hover:text-dnd-gold transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h3 className="text-xl font-serif font-bold text-dnd-text leading-none">Edit Atmosphere</h3>
                    <p className="text-dnd-text/40 text-sm">Scene: <span className="text-dnd-gold">{scene.name}</span></p>
                </div>
            </div>

            <div className="flex gap-2 mb-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dnd-text/20" size={16} />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search sounds..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold outline-none transition-colors"
                    />
                </div>
                <select 
                    value={filter} 
                    onChange={e => setFilter(e.target.value as any)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 text-sm text-dnd-text/60 focus:border-dnd-gold outline-none"
                >
                    <option value="All">All Types</option>
                    <option value="BGM">Music</option>
                    <option value="Ambience">Ambience</option>
                </select>
            </div>
            
            {/* Adjusted grid to include Preview column */}
            <div className="grid grid-cols-[3rem_2fr_repeat(3,1fr)] gap-3 mb-2 px-2 text-xs font-black text-dnd-text/20 uppercase tracking-widest text-center items-center">
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
                        <div key={sound.id} className={`grid grid-cols-[3rem_2fr_repeat(3,1fr)] gap-3 items-center p-2 rounded-lg border transition-colors ${activeLevels.size > 0 ? 'bg-white/5 border-white/10' : 'border-transparent hover:bg-white/5'}`}>
                            
                            <div className="flex justify-center">
                                <button 
                                    onClick={() => togglePreview(sound)}
                                    className={`p-2 rounded-full transition-colors ${previewId === sound.id ? 'text-dnd-gold bg-white/10' : 'text-dnd-text/20 hover:text-dnd-gold hover:bg-white/5'}`}
                                    title={previewId === sound.id ? "Stop Preview" : "Play Preview"}
                                >
                                    {previewId === sound.id ? <StopCircle size={20} /> : <Play size={20} />}
                                </button>
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm font-medium text-dnd-text truncate" title={sound.name}>{sound.name}</p>
                                <div className="flex items-center gap-1">
                                     <span className="text-[10px] text-dnd-text/40 uppercase tracking-wider">{sound.type === 'Background Music' ? 'Music' : 'Ambience'}</span>
                                     {sound.include_in_all_scenes && <Globe size={10} className="text-dnd-gold/60" />}
                                </div>
                            </div>
                            
                            {(['Relaxed', 'Neutral', 'Intense'] as AtmosphereLevel[]).map(level => {
                                const isActive = activeLevels.has(level);
                                const config = atmosphereConfig[level];
                                return (
                                    <div key={level} className="flex justify-center">
                                        <button
                                            onClick={() => handleToggle(sound.id, level)}
                                            className={`w-full max-w-[60px] h-8 rounded-md flex items-center justify-center transition-all border ${isActive ? config.activeClass : 'bg-black/40 border-white/5 text-dnd-text/20 hover:border-white/20 hover:text-dnd-text/40'}`}
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
                {filteredSounds.length === 0 && <p className="text-center text-dnd-text/40 py-8">No matching sounds found.</p>}
            </div>

            <div className="mt-4 flex justify-end pt-4 border-t border-white/5">
                <button onClick={handleSave} disabled={isSaving} className="py-2 px-8 rounded-xl text-black bg-dnd-gold font-black uppercase tracking-widest hover:brightness-110 disabled:bg-white/10 disabled:text-dnd-text/40 shadow-lg transition-all flex items-center gap-2">
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
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      <div 
        className={`relative bg-dnd-panel/80 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-3xl p-6 w-full m-4 h-[85vh] flex flex-col transition-all duration-300 ${editingScene ? 'max-w-4xl' : 'max-w-2xl'} ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}
        onClick={() => setConfirmDeleteId(null)}
      >
        {!editingScene ? (
            // LIST VIEW
            <>
                <div className="flex justify-between items-center mb-6" onClick={e => e.stopPropagation()}>
                    <h2 className="text-2xl font-serif font-bold text-dnd-text flex items-center gap-2 drop-shadow-sm">
                        <Layers className="text-dnd-gold" size={24} /> Manage Scenes
                    </h2>
                    <button onClick={handleClose} className="p-2 text-dnd-text/40 hover:text-dnd-gold hover:bg-white/5 rounded-full transition-colors">
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
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-dnd-text placeholder-dnd-text/20 focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold outline-none transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={isSubmitting || !newSceneName.trim()}
                            className="bg-dnd-gold hover:brightness-110 text-black p-3 rounded-xl disabled:bg-white/10 disabled:text-dnd-text/40 transition-all shadow-lg"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                    {error && (
                    <div className="flex items-center gap-2 text-dnd-red text-sm mt-3 bg-dnd-red/10 p-3 rounded-lg border border-dnd-red/20 animate-pulse">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                    )}
                </form>

                <div className="flex-grow min-h-0 overflow-y-auto bg-black/20 rounded-xl border border-white/5 p-2 custom-scrollbar" onClick={e => e.stopPropagation()}>
                    {scenes.length === 0 ? (
                        <p className="text-dnd-text/40 text-center py-8 italic">No scenes created yet.</p>
                    ) : (
                        <ul className="space-y-2">
                            {scenes.map(scene => {
                                const isConfirming = confirmDeleteId === scene.id;
                                return (
                                    <li 
                                        key={scene.id} 
                                        className={`flex justify-between items-center p-3 rounded-lg transition-all duration-200 border ${isConfirming ? 'bg-dnd-red/10 border-dnd-red/20' : 'bg-black/40 border-transparent hover:bg-white/5 hover:border-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className={`font-medium truncate transition-colors ${isConfirming ? 'text-dnd-red' : 'text-dnd-text'}`}>
                                                {scene.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {!isConfirming && (
                                                <button
                                                    onClick={() => setEditingScene(scene)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-dnd-gold hover:brightness-110 hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <Layers size={14} /> Atmosphere
                                                </button>
                                            )}

                                            <button 
                                                type="button"
                                                onClick={(e) => handleDeleteClick(e, scene.id)}
                                                className={`px-3 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm ${
                                                    isConfirming 
                                                    ? "bg-dnd-red text-white hover:brightness-110 scale-105" 
                                                    : "text-dnd-text/40 hover:text-dnd-red hover:bg-white/5 bg-white/5 border border-white/10"
                                                }`}
                                            >
                                                {isConfirming ? (
                                                    <>
                                                        <Check size={16} strokeWidth={3} />
                                                        <span className="text-xs font-black uppercase tracking-widest">Confirm</span>
                                                    </>
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                            
                                            {isConfirming && (
                                                <button
                                                    type="button"
                                                    onClick={cancelDelete}
                                                    className="text-dnd-text/40 hover:text-dnd-text p-1.5 hover:bg-white/5 rounded-lg transition-colors"
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
                    <button onClick={handleClose} className="py-2 px-8 rounded-xl text-dnd-text/60 hover:text-dnd-gold bg-white/5 hover:bg-white/10 transition-all font-bold uppercase tracking-wider text-sm">Close</button>
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
