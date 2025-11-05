import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Sound, SoundboardPreset, SoundType } from './types';
import { SoundManager } from './lib/SoundManager';
import { signInWithUsername, signOut, getUser } from './lib/authService';
import { getSoundFiles, uploadSoundFile, updateSoundFile, deleteSoundFile } from './lib/soundFileService';
import { getPresets, createPreset, deletePreset, updatePreset } from './lib/presetService';
import { SoundTile } from './components/SoundTile';
import { PresetHeader } from './components/PresetHeader';
import { AddSoundModal } from './components/AddSoundModal';
import { EditSoundModal } from './components/EditSoundModal';
import { PresetManagerModal } from './components/PresetManagerModal';
import { PlusCircle } from 'lucide-react';
// Fix: Import the supabase client to resolve 'Cannot find name' errors.
import { supabase } from './lib/supabase';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const [sounds, setSounds] = useState<Sound[]>([]);
    const [presets, setPresets] = useState<SoundboardPreset[]>([]);
    const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [playingStates, setPlayingStates] = useState<Record<string, boolean>>({});
    const [masterBGMVolume, setMasterBGMVolume] = useState(0.5);
    const soundManagerRef = useRef<SoundManager | null>(null);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isPresetModalOpen, setPresetModalOpen] = useState(false);
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
            setPresets([]);
            setCurrentPresetId(null);
            soundManagerRef.current?.stopAllSounds();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, onStateChange]);

    const fetchData = async (userId: string) => {
        setIsLoading(true);
        const [fetchedSounds, fetchedPresets] = await Promise.all([
            getSoundFiles(userId),
            getPresets(userId),
        ]);
        setSounds(fetchedSounds);
        setPresets(fetchedPresets);
        soundManagerRef.current?.loadSounds(fetchedSounds);
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

    const handleAddSound = async (file: File, details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at'>) => {
        if (!user) return;
        const newSound = await uploadSoundFile(user.id, file, details);
        if (newSound) {
            setSounds(s => [...s, newSound]);
            soundManagerRef.current?.loadSound(newSound);
            setHasUnsavedChanges(true);
        }
    };
    
    const handleUpdateSound = async (id: string, updates: Partial<Sound>) => {
        const updatedSound = await updateSoundFile(id, updates);
        if (updatedSound) {
            setSounds(s => s.map(sound => sound.id === id ? updatedSound : sound));
            soundManagerRef.current?.loadSound(updatedSound);
            setHasUnsavedChanges(true);
        }
    };

    const handleDeleteSound = async (soundToDelete: Sound) => {
        if (window.confirm(`Are you sure you want to delete "${soundToDelete.name}"?`)) {
            soundManagerRef.current?.stopSound(soundToDelete);
            const success = await deleteSoundFile(soundToDelete);
            if (success) {
                setSounds(s => s.filter(sound => sound.id !== soundToDelete.id));
                setHasUnsavedChanges(true);
            }
        }
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (preset) {
            soundManagerRef.current?.stopAllSounds();
            const soundsWithUrls = preset.sounds.map(sound => {
                const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(sound.file_path);
                return { ...sound, publicURL: publicUrl };
            });
            setSounds(soundsWithUrls);
            soundManagerRef.current?.loadSounds(soundsWithUrls);
            setCurrentPresetId(presetId);
            setHasUnsavedChanges(false);
        }
    };

    const handleCreatePreset = async (name: string) => {
        if (!user) return;
        
        let targetSounds = sounds;
        if (currentPresetId && hasUnsavedChanges) {
           await handleUpdatePreset(currentPresetId, sounds);
        }

        const newPreset = await createPreset(user.id, name, targetSounds);
        if (newPreset) {
            setPresets(p => [...p, newPreset]);
            setCurrentPresetId(newPreset.id);
            setHasUnsavedChanges(false);
        }
    };

    const handleUpdatePreset = async (presetId: string, updatedSounds: Sound[]) => {
        const updatedPreset = await updatePreset(presetId, updatedSounds);
        if(updatedPreset) {
            setPresets(p => p.map(pr => pr.id === presetId ? updatedPreset : pr));
        }
    }

    const handleDeletePreset = async (presetId: string) => {
        if (window.confirm("Are you sure you want to delete this preset?")) {
            const success = await deletePreset(presetId);
            if (success) {
                setPresets(p => p.filter(preset => preset.id !== presetId));
                if (currentPresetId === presetId) {
                    setCurrentPresetId(null);
                    setSounds([]);
                }
            }
        }
    };

    // Render logic
    if (isLoading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-sm">
                    <h1 className="text-4xl font-bold text-center text-white mb-8">TTRPG Soundboard</h1>
                    <form onSubmit={handleLogin} className="bg-slate-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
                        <div className="mb-4">
                            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="username">Username</label>
                            <input className="shadow appearance-none border rounded w-full py-2 px-3 bg-slate-700 border-slate-600 text-white leading-tight focus:outline-none focus:shadow-outline" id="username" name="username" type="text" placeholder="Username" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="password">Password</label>
                            <input className="shadow appearance-none border rounded w-full py-2 px-3 bg-slate-700 border-slate-600 text-white mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" name="password" type="password" placeholder="******************" required />
                            {authError && <p className="text-red-500 text-xs italic">{authError}</p>}
                        </div>
                        <div className="flex items-center justify-between">
                            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit">
                                Sign In / Sign Up
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }
    
    const renderSoundSection = (type: SoundType, title: string) => (
        <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
                {sounds.filter(s => s.type === type).map(sound => (
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
        </section>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <PresetHeader
                presets={presets}
                currentPresetId={hasUnsavedChanges ? null : currentPresetId}
                onLoadPreset={handleLoadPreset}
                onManagePresets={() => setPresetModalOpen(true)}
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

                <div className="mt-8">
                    <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 py-3 px-5 rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-colors">
                        <PlusCircle size={20} />
                        Add Sound
                    </button>
                </div>
            </main>
            
            <AddSoundModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onAddSound={handleAddSound} />
            <EditSoundModal isOpen={isEditModalOpen} sound={soundToEdit} onClose={() => setEditModalOpen(false)} onUpdateSound={handleUpdateSound} />
            <PresetManagerModal
                isOpen={isPresetModalOpen}
                presets={presets}
                onClose={() => setPresetModalOpen(false)}
                onCreatePreset={handleCreatePreset}
                onDeletePreset={handleDeletePreset}
                onLoadPreset={handleLoadPreset}
            />
        </div>
    );
};

export default App;