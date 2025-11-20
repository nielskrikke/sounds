
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Sound, SoundType, Scene, AtmosphereLevel } from './types';
import { SoundManager } from './lib/SoundManager';
import { signInWithUsername, signOut, getUser } from './lib/authService';
import { 
    getSoundFiles, 
    uploadSoundFile, 
    updateSoundFile, 
    deleteSoundFile,
    getScenes,
    getSoundSceneJoins,
    addScene,
    removeScene
} from './lib/soundFileService';
import { SoundTile } from './components/SoundTile';
import { SceneHeader } from './components/PresetHeader';
import { AddSoundModal } from './components/AddSoundModal';
import { EditSoundModal } from './components/EditSoundModal';
import { SoundManagerModal } from './components/SoundManagerModal';
import { SceneManagerModal } from './components/SceneManagerModal';
import { supabase } from './lib/supabase';
import { AtmosphereFooter } from './components/AtmosphereFooter';
import { SearchWidget } from './components/SearchWidget';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const [sounds, setSounds] = useState<Sound[]>([]);
    const [librarySounds, setLibrarySounds] = useState<Sound[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
    const [activeMoodFilter, setActiveMoodFilter] = useState<string | null>(null);
    const [activeSETypeFilter, setActiveSETypeFilter] = useState<string | null>(null);
    const [activeAtmosphere, setActiveAtmosphere] = useState<AtmosphereLevel | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [playingStates, setPlayingStates] = useState<Record<string, boolean>>({});
    const [audioContextState, setAudioContextState] = useState<AudioContextState>('suspended');
    const [masterBGMVolume, setMasterBGMVolume] = useState(0.5);
    const soundManagerRef = useRef<SoundManager | null>(null);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isSoundManagerModalOpen, setSoundManagerModalOpen] = useState(false);
    const [isSceneManagerModalOpen, setSceneManagerModalOpen] = useState(false);
    const [soundToEdit, setSoundToEdit] = useState<Sound | null>(null);

    const fetchData = async (userId: string, showLoading = true) => {
        if (showLoading) setIsLoading(true);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const favoriteSoundIds = new Set<string>(currentUser?.user_metadata?.favorite_sounds || []);

        const [fetchedSounds, fetchedScenes, fetchedJoins] = await Promise.all([
            getSoundFiles(userId),
            getScenes(userId),
            getSoundSceneJoins(userId),
        ]);

        const scenesById = new Map(fetchedScenes.map(s => [s.id, s.name]));
        const soundsWithScenes = fetchedSounds.map(sound => {
            const soundScenes = fetchedJoins
                .filter(j => j.sound_id === sound.id)
                .map(j => {
                    const sceneName = scenesById.get(j.scene_id);
                    return sceneName ? { id: j.scene_id, name: sceneName, atmosphere: j.atmosphere } as Scene : undefined;
                })
                .filter((s): s is Scene => s !== undefined);

            return { 
                ...sound, 
                scenes: soundScenes,
                favorite: favoriteSoundIds.has(sound.id) 
            };
        });

        setLibrarySounds(soundsWithScenes);
        setScenes(fetchedScenes.sort((a,b) => a.name.localeCompare(b.name)));
        soundManagerRef.current?.loadSounds(soundsWithScenes);
        
        if (showLoading) setIsLoading(false);
    };

    // Authentication and data fetching
    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await getUser();
            setUser(currentUser);
            if (!currentUser) setIsLoading(false);
        };
        checkUser();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (!session?.user) setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const onStateChange = useCallback((newState: { playingStates: Record<string, boolean>, audioContextState: AudioContextState }) => {
        setPlayingStates(newState.playingStates);
        setAudioContextState(newState.audioContextState);
    }, []);

    useEffect(() => {
        if (user && !soundManagerRef.current) {
            soundManagerRef.current = new SoundManager(onStateChange);
        }
        if (user) {
            fetchData(user.id, true);
        } else {
            setSounds([]);
            setLibrarySounds([]);
            setScenes([]);
            setActiveSceneId(null);
            soundManagerRef.current?.stopAllSounds();
        }
    }, [user, onStateChange]);

    useEffect(() => {
        let filtered = librarySounds;

        // 1. Scene Filter
        if (activeSceneId !== null) {
            filtered = filtered.filter(sound => 
                sound.include_in_all_scenes || sound.scenes?.some(scene => scene.id === activeSceneId)
            );
        }

        // 2. Search Filter (Live typing)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(s => 
                s.name.toLowerCase().includes(q) || 
                s.category_tag?.toLowerCase().includes(q) ||
                s.mood_tag?.toLowerCase().includes(q) ||
                s.location_tag?.toLowerCase().includes(q) ||
                s.type_tag?.toLowerCase().includes(q)
            );
        }

        setSounds(filtered);
        
        setActiveMoodFilter(null);
        setActiveSETypeFilter(null);
        
        if(activeAtmosphere && soundManagerRef.current) {
            librarySounds.forEach(sound => {
                if((sound.type === "Background Music" || sound.type === "Ambience") && playingStates[sound.id]) {
                    soundManagerRef.current?.stopSound(sound);
                }
            })
        }
        setActiveAtmosphere(null); 
    }, [activeSceneId, librarySounds, searchQuery]); 

    const handleSceneChange = (id: string | null) => {
        setActiveSceneId(id);
        setSearchQuery(''); 
    }

    // Handlers
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const { username, password } = Object.fromEntries(new FormData(e.currentTarget));
        if (typeof username !== 'string' || typeof password !== 'string') return;

        const { error } = await signInWithUsername(username, password);
        if (error) setAuthError(error.message);
        else setAuthError(null);
    };

    const handleLogout = async () => {
        soundManagerRef.current?.stopAllSounds();
        await signOut();
    };

    const handlePlaySound = (sound: Sound) => soundManagerRef.current?.playSound(sound);
    const handleStopSound = (sound: Sound) => soundManagerRef.current?.stopSound(sound);
    const handleToggleGlobalPlayPause = () => soundManagerRef.current?.toggleGlobalPlayPause();
    const handleStopAllSounds = () => {
        setActiveAtmosphere(null);
        soundManagerRef.current?.stopAllSounds();
    }
    
    const handleBGMVolumeChange = (volume: number) => {
        setMasterBGMVolume(volume);
        soundManagerRef.current?.setMasterBGMVolume(volume);
    };

    const handleSelectAtmosphere = (atmosphere: AtmosphereLevel) => {
        if (!soundManagerRef.current) return;

        const newAtmosphere = atmosphere === activeAtmosphere ? null : atmosphere;
        setActiveAtmosphere(newAtmosphere);

        const contextSounds = sounds.filter(s => s.type === 'Background Music' || s.type === 'Ambience');

        contextSounds.forEach(sound => {
            const isPlaying = playingStates[sound.id];
            let matchesAtmosphere = false;

            if (activeSceneId) {
                const sceneInfo = sound.scenes?.find(s => s.id === activeSceneId);
                if (sceneInfo && sceneInfo.atmosphere) {
                     matchesAtmosphere = sceneInfo.atmosphere.includes(newAtmosphere!);
                }
            } else {
                // Global / All View
                if (sound.atmosphere) {
                    matchesAtmosphere = sound.atmosphere.includes(newAtmosphere!);
                }
            }

            const shouldBePlaying = newAtmosphere && matchesAtmosphere;

            if (isPlaying && !shouldBePlaying) {
                soundManagerRef.current?.stopSound(sound);
            } else if (!isPlaying && shouldBePlaying) {
                soundManagerRef.current?.playSound(sound);
            }
        });
    };
    
    // Scene Management Handlers
    const handleAddScene = async (name: string) => {
        if (!user) return;
        await addScene(user.id, name);
        await fetchData(user.id, false);
    }

    const handleRemoveScene = async (id: string) => {
        if (!user) return { success: false, error: "Not authenticated" };
        
        const result = await removeScene(id, user.id);
        
        if (result.success) {
            if (activeSceneId === id) setActiveSceneId(null);
            await fetchData(user.id, false);
        }
        return result;
    }

    const handleAddSound = async (file: File, details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes' | 'atmosphere' | 'favorite'> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null>, favorite: boolean }) => {
        if (!user) return;
        const { favorite, ...otherDetails } = details;
        const newSound = await uploadSoundFile(user.id, file, otherDetails);
        
        if (newSound) {
            if (favorite) {
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const currentFavorites: string[] = currentUser?.user_metadata?.favorite_sounds || [];
                const newFavorites = [...new Set([...currentFavorites, newSound.id])];
                await supabase.auth.updateUser({ data: { favorite_sounds: newFavorites } });
            }
            await fetchData(user.id, false);
        }
    };
    
    const handleUpdateSound = async (id: string, updates: Partial<Omit<Sound, 'scenes'>> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null> }) => {
        if (!user) return;

        const { favorite, ...otherUpdates } = updates;

        if (typeof favorite === 'boolean') {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
                const currentFavorites: string[] = currentUser.user_metadata?.favorite_sounds || [];
                let newFavorites: string[];
                if (favorite) {
                    newFavorites = [...new Set([...currentFavorites, id])];
                } else {
                    newFavorites = currentFavorites.filter((favId: string) => favId !== id);
                }

                if (JSON.stringify(currentFavorites.sort()) !== JSON.stringify(newFavorites.sort())) {
                    await supabase.auth.updateUser({ data: { favorite_sounds: newFavorites } });
                }
            }
        }
        
        const hasOtherUpdates = Object.keys(otherUpdates).length > 0;

        if(hasOtherUpdates) {
             await updateSoundFile(id, otherUpdates as any);
        }
        
        await fetchData(user.id, false);
    };

    const handleDeleteSound = async (soundToDelete: Sound) => {
        if (!user) return;
        soundManagerRef.current?.stopSound(soundToDelete);
        const { success, error } = await deleteSoundFile(soundToDelete);
        if (success) {
            await fetchData(user.id, false);
        } else {
            console.error("Delete failed:", error);
            alert(`Failed to delete sound. ${error}`);
        }
    };

    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-stone-900 text-white">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-sm">
                    <h1 className="text-5xl font-medieval font-bold text-center text-white mb-8 drop-shadow-md">TTRPG Soundboard</h1>
                    <form onSubmit={handleLogin} className="bg-stone-900/60 backdrop-blur-2xl border border-stone-700/50 shadow-2xl rounded-3xl px-8 pt-6 pb-8 mb-4 animate-modal-in">
                        <div className="mb-4">
                            <label className="block text-stone-300 text-sm font-bold mb-2" htmlFor="username">Username</label>
                            <input className="shadow appearance-none border border-stone-600/50 rounded-xl w-full py-2 px-3 bg-stone-800/40 text-white leading-tight focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" id="username" name="username" type="text" placeholder="Username" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-stone-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <input className="shadow appearance-none border border-stone-600/50 rounded-xl w-full py-2 px-3 bg-stone-800/40 text-white mb-3 leading-tight focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" id="password" name="password" type="password" placeholder="******************" required />
                            {authError && <p className="text-red-400 text-xs italic bg-red-900/20 p-2 rounded border border-red-800/50">{authError}</p>}
                        </div>
                        <div className="flex items-center justify-between">
                            <button className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-xl focus:outline-none focus:shadow-outline w-full shadow-lg hover:shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 duration-300" type="submit">
                                Sign In / Sign Up
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    
    const renderSoundSection = (type: SoundType, title: string) => {
        let sectionSounds = sounds.filter(s => s.type === type);
        let filterUI = null;
    
        if (type === 'Background Music') {
            const moods = [...new Set(
                librarySounds
                    .filter(s => s.type === 'Background Music' && s.mood_tag)
                    .map(s => s.mood_tag!)
            )].sort();
    
            if (activeMoodFilter) {
                sectionSounds = sectionSounds.filter(s => s.mood_tag === activeMoodFilter);
            }
    
            if (moods.length > 0) {
                filterUI = (
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="text-sm font-semibold text-stone-400">Mood:</span>
                         <button 
                            onClick={() => setActiveMoodFilter(null)} 
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${!activeMoodFilter ? 'bg-amber-600 text-white font-bold' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                        >
                            All
                        </button>
                        {moods.map(mood => (
                            <button 
                                key={mood} 
                                onClick={() => setActiveMoodFilter(mood)} 
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${activeMoodFilter === mood ? 'bg-amber-600 text-white font-bold' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                            >
                                {mood}
                            </button>
                        ))}
                    </div>
                );
            }
        } else if (type === 'One-shots') {
            const types = [...new Set(
                librarySounds
                    .filter(s => s.type === 'One-shots' && s.type_tag)
                    .flatMap(s => s.type_tag!.split(',').map(t => t.trim()).filter(Boolean))
            )].sort();

            if (activeSETypeFilter) {
                sectionSounds = sectionSounds.filter(s => 
                    s.type_tag?.split(',').map(t => t.trim()).includes(activeSETypeFilter)
                );
            }

            if (types.length > 0) {
                filterUI = (
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="text-sm font-semibold text-stone-400">Type:</span>
                        <button
                            onClick={() => setActiveSETypeFilter(null)}
                            className={`px-3 py-1 text-xs rounded-full transition-colors ${!activeSETypeFilter ? 'bg-amber-600 text-white font-bold' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                        >
                            All
                        </button>
                        {types.map(sfxType => (
                            <button
                                key={sfxType}
                                onClick={() => setActiveSETypeFilter(sfxType)}
                                className={`px-3 py-1 text-xs rounded-full transition-colors ${activeSETypeFilter === sfxType ? 'bg-amber-600 text-white font-bold' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}
                            >
                                {sfxType}
                            </button>
                        ))}
                    </div>
                );
            }
        }
    
        const hasSoundsOfTypeInScene = sounds.some(s => s.type === type);
    
        if (!hasSoundsOfTypeInScene && !searchQuery) {
            return null;
        }
        
        if (searchQuery && sectionSounds.length === 0) {
            return null;
        }

        sectionSounds.sort((a, b) => {
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            return a.name.localeCompare(b.name);
        });
    
        return (
            <section className="mb-8">
                <h2 className="text-2xl font-medieval font-bold text-white mb-4">{title}</h2>
                {filterUI}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                    {sectionSounds.map(sound => (
                        <SoundTile 
                            key={sound.id} 
                            sound={sound}
                            isPlaying={!!playingStates[sound.id]}
                            onPlay={handlePlaySound}
                            onStop={handleStopSound}
                        />
                    ))}
                </div>
            </section>
        );
    }

    const isAnythingPlaying = Object.values(playingStates).some(p => p);
    const sortedLibrarySounds = [...librarySounds].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex flex-col">
            <SceneHeader
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSelectScene={handleSceneChange}
                isAudioContextPlaying={audioContextState === 'running'}
                onToggleGlobalPlayPause={handleToggleGlobalPlayPause}
                onStopAllSounds={handleStopAllSounds}
                bgmVolume={masterBGMVolume}
                onBgmVolumeChange={handleBGMVolumeChange}
                onLogout={handleLogout}
                onOpenSoundManager={() => setSoundManagerModalOpen(true)}
                onOpenSceneManager={() => setSceneManagerModalOpen(true)}
                airplayElement={soundManagerRef.current?.airPlayAudioElement || null}
                isPlayerVisible={isAnythingPlaying}
            />

            <main className="flex-grow p-4 md:p-8 pb-24">
                {renderSoundSection('Background Music', 'Background Music')}
                {renderSoundSection('Ambience', 'Ambience')}
                {renderSoundSection('One-shots', 'One-shots')}

                 {sounds.length === 0 && librarySounds.length > 0 && (
                    <div className="text-center text-stone-400 mt-10">
                        {searchQuery ? (
                             <p className="text-lg">No sounds match "{searchQuery}"</p>
                        ) : (
                            <>
                                <p className="text-lg">No sounds found in this scene.</p>
                                <p>Try selecting another scene or "All".</p>
                            </>
                        )}
                    </div>
                 )}
            </main>
            
            <AtmosphereFooter 
                activeAtmosphere={activeAtmosphere}
                onSelectAtmosphere={handleSelectAtmosphere}
                isSceneActive={!!activeSceneId || activeSceneId === null} // Always active now
            />
            
            <SearchWidget searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

            <AddSoundModal 
                isOpen={isAddModalOpen} 
                onClose={() => { 
                    setAddModalOpen(false); 
                    setSoundManagerModalOpen(true);
                }} 
                onAddSound={handleAddSound} 
                allScenes={scenes} 
            />
            <EditSoundModal 
                isOpen={isEditModalOpen} 
                sound={soundToEdit} 
                onClose={() => {
                    setEditModalOpen(false); 
                    setSoundToEdit(null);
                    setSoundManagerModalOpen(true);
                }} 
                onUpdateSound={handleUpdateSound} 
                allScenes={scenes} 
            />
            <SoundManagerModal
                isOpen={isSoundManagerModalOpen}
                onClose={() => setSoundManagerModalOpen(false)}
                sounds={sortedLibrarySounds}
                onAddSound={() => {
                    setSoundManagerModalOpen(false);
                    setAddModalOpen(true);
                }}
                onEditSound={(sound) => {
                    setSoundManagerModalOpen(false);
                    setSoundToEdit(sound);
                    setEditModalOpen(true);
                }}
                onDeleteSound={handleDeleteSound}
            />
            <SceneManagerModal
                isOpen={isSceneManagerModalOpen}
                onClose={() => setSceneManagerModalOpen(false)}
                scenes={scenes}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
            />
        </div>
    );
};

export default App;
