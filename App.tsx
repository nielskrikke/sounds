
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Sound, SoundType, Scene } from './types';
import { SoundManager } from './lib/SoundManager';
import { signInWithUsername, signOut, getUser } from './lib/authService';
import { 
    getSoundFiles, 
    uploadSoundFile, 
    updateSoundFile, 
    deleteSoundFile,
    getScenes,
    getSoundSceneJoins,
    deleteOrphanedScenes
} from './lib/soundFileService';
import { SoundTile } from './components/SoundTile';
import { SceneHeader } from './components/PresetHeader'; // Using the same filename for simplicity
import { AddSoundModal } from './components/AddSoundModal';
import { EditSoundModal } from './components/EditSoundModal';
import { PlusCircle } from 'lucide-react';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const [sounds, setSounds] = useState<Sound[]>([]);
    const [librarySounds, setLibrarySounds] = useState<Sound[]>([]);
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
    const [activeMoodFilter, setActiveMoodFilter] = useState<string | null>(null);
    
    const [playingStates, setPlayingStates] = useState<Record<string, boolean>>({});
    const [masterBGMVolume, setMasterBGMVolume] = useState(0.5);
    const soundManagerRef = useRef<SoundManager | null>(null);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [soundToEdit, setSoundToEdit] = useState<Sound | null>(null);

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

    const onStateChange = useCallback((newStates: Record<string, boolean>) => {
        setPlayingStates(newStates);
    }, []);

    useEffect(() => {
        if (user && !soundManagerRef.current) {
            soundManagerRef.current = new SoundManager(onStateChange);
        }
        if (user) {
            fetchData(user.id);
        } else {
            setSounds([]);
            setLibrarySounds([]);
            setScenes([]);
            setActiveSceneId(null);
            soundManagerRef.current?.stopAllSounds();
        }
    }, [user, onStateChange]);

    useEffect(() => {
        if (activeSceneId === null) {
            setSounds(librarySounds);
        } else {
            setSounds(librarySounds.filter(sound => 
                sound.include_in_all_scenes || sound.scenes?.some(scene => scene.id === activeSceneId)
            ));
        }
        setActiveMoodFilter(null);
    }, [activeSceneId, librarySounds]);


    const fetchData = async (userId: string) => {
        setIsLoading(true);
        const [fetchedSounds, fetchedScenes, fetchedJoins] = await Promise.all([
            getSoundFiles(userId),
            getScenes(userId),
            getSoundSceneJoins(userId),
        ]);

        const scenesById = new Map(fetchedScenes.map(s => [s.id, s]));
        const soundsWithScenes = fetchedSounds.map(sound => {
            const soundScenes = fetchedJoins
                .filter(j => j.sound_id === sound.id)
                .map(j => scenesById.get(j.scene_id))
                .filter((s): s is Scene => s !== undefined);
            return { ...sound, scenes: soundScenes };
        });

        setLibrarySounds(soundsWithScenes);
        setScenes(fetchedScenes.sort((a,b) => a.name.localeCompare(b.name)));
        soundManagerRef.current?.loadSounds(soundsWithScenes);
        setIsLoading(false);
    };

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
    const handleToggleBGM = () => soundManagerRef.current?.toggleBGMPlayPause();
    
    const handleBGMVolumeChange = (volume: number) => {
        setMasterBGMVolume(volume);
        soundManagerRef.current?.setMasterBGMVolume(volume);
    };

    const handleAddSound = async (file: File, details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes'> & { sceneNames: string[] }) => {
        if (!user) return;
        const newSound = await uploadSoundFile(user.id, file, details);
        if (newSound) {
            await fetchData(user.id); // Refetch to get new sound with correct scene data
        }
    };
    
    const handleUpdateSound = async (id: string, updates: Partial<Omit<Sound, 'scenes'>> & { sceneNames: string[] }) => {
        if (!user) return;
        const updatedSound = await updateSoundFile(id, updates);
        if (updatedSound) {
            await deleteOrphanedScenes(user.id);
            await fetchData(user.id); // Refetch to ensure all scene data is consistent
        }
    };

    const handleDeleteSound = async (soundToDelete: Sound) => {
        if (window.confirm(`Are you sure you want to delete "${soundToDelete.name}"?`)) {
            if (!user) return;
            soundManagerRef.current?.stopSound(soundToDelete);
            const success = await deleteSoundFile(soundToDelete);
            if (success) {
                await deleteOrphanedScenes(user.id);
                await fetchData(user.id);
            }
        }
    };

    // Render logic
    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-stone-900 text-white">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-sm">
                    <h1 className="text-5xl font-medieval font-bold text-center text-white mb-8">TTRPG Soundboard</h1>
                    <form onSubmit={handleLogin} className="bg-stone-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                        <div className="mb-4">
                            <label className="block text-stone-300 text-sm font-bold mb-2" htmlFor="username">Username</label>
                            <input className="shadow appearance-none border rounded w-full py-2 px-3 bg-stone-700 border-stone-600 text-white leading-tight focus:outline-none focus:shadow-outline" id="username" name="username" type="text" placeholder="Username" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-stone-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <input className="shadow appearance-none border rounded w-full py-2 px-3 bg-stone-700 border-stone-600 text-white mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" name="password" type="password" placeholder="******************" required />
                            {authError && <p className="text-red-500 text-xs italic">{authError}</p>}
                        </div>
                        <div className="flex items-center justify-between">
                            <button className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit">
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
        let moodFilterUI = null;
    
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
                moodFilterUI = (
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
        }
    
        const hasSoundsOfTypeInScene = sounds.some(s => s.type === type);
    
        if (!hasSoundsOfTypeInScene) {
            return null; // Don't render the section at all if there are no sounds of this type in the current scene
        }
    
        return (
            <section className="mb-8">
                <h2 className="text-3xl font-medieval font-bold text-white mb-4">{title}</h2>
                {moodFilterUI}
                {sectionSounds.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                        {sectionSounds.map(sound => (
                            <SoundTile 
                                key={sound.id} 
                                sound={sound}
                                isPlaying={!!playingStates[sound.id]}
                                onPlay={handlePlaySound}
                                onStop={handleStopSound}
                                onEdit={(s) => { setSoundToEdit(s); setEditModalOpen(true); }}
                                onDelete={handleDeleteSound}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-stone-400 italic">No sounds match the current filter in this scene.</p>
                )}
            </section>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900">
            <SceneHeader
                scenes={scenes}
                activeSceneId={activeSceneId}
                onSelectScene={setActiveSceneId}
                isBgmPlaying={Object.entries(playingStates).some(([id, playing]) => playing && sounds.find(s => s.id === id)?.type === 'Background Music')}
                onToggleBgm={handleToggleBGM}
                bgmVolume={masterBGMVolume}
                onBgmVolumeChange={handleBGMVolumeChange}
                onLogout={handleLogout}
                airplayElement={soundManagerRef.current?.airPlayAudioElement || null}
            />

            <main className="p-4 md:p-8">
                {renderSoundSection('Background Music', 'Background Music')}
                {renderSoundSection('Ambience', 'Ambience')}
                {renderSoundSection('Sound Effect', 'Sound Effects')}

                 {sounds.length === 0 && librarySounds.length > 0 && (
                    <div className="text-center text-stone-400 mt-10">
                        <p className="text-lg">No sounds found in this scene.</p>
                        <p>Try selecting another scene or "All".</p>
                    </div>
                 )}

                <div className="mt-8">
                    <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 py-3 px-5 rounded-lg text-white bg-amber-600 hover:bg-amber-500 transition-colors">
                        <PlusCircle size={20} />
                        Add Sound
                    </button>
                </div>
            </main>
            
            <AddSoundModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onAddSound={handleAddSound} />
            <EditSoundModal isOpen={isEditModalOpen} sound={soundToEdit} onClose={() => {setEditModalOpen(false); setSoundToEdit(null);}} onUpdateSound={handleUpdateSound} />
        </div>
    );
};

export default App;
