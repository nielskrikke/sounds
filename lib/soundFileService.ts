import { supabase } from './supabase';
import { Sound, Scene, SoundSceneJoin, AtmosphereLevel, SoundType } from '../types';
import { v4 as uuidv4 } from 'https://aistudiocdn.com/uuid@^13.0.0';

// --- Scene Service Functions ---

export const getScenes = async (userId: string): Promise<Scene[]> => {
    const { data, error } = await supabase.from('scenes').select('*').eq('user_id', userId);
    if (error) {
        console.error('Error fetching scenes:', error.message);
        return [];
    }
    return data || [];
};

export const getOrCreateScenes = async (userId: string, sceneNames: string[]): Promise<Scene[]> => {
    if (sceneNames.length === 0) return [];
    
    const trimmedNames = sceneNames.map(name => name.trim()).filter(Boolean);
    if (trimmedNames.length === 0) return [];

    const { data: existingScenes, error: fetchError } = await supabase
        .from('scenes')
        .select('id, name')
        .in('name', trimmedNames)
        .eq('user_id', userId);

    if (fetchError) {
        console.error('Error fetching existing scenes:', fetchError.message);
        return [];
    }

    const existingNames = new Set(existingScenes.map(s => s.name));
    const newSceneNames = trimmedNames.filter(name => !existingNames.has(name));
    let newScenes: Scene[] = [];

    if (newSceneNames.length > 0) {
        const { data, error: insertError } = await supabase
            .from('scenes')
            .insert(newSceneNames.map(name => ({ name, user_id: userId })))
            .select('id, name');
        
        if (insertError) {
            console.error('Error creating new scenes:', insertError.message);
        } else if (data) {
            newScenes = data;
        }
    }
    
    return [...existingScenes, ...newScenes];
};

export const getSoundSceneJoins = async (userId: string): Promise<SoundSceneJoin[]> => {
    const { data: userSounds, error: soundsError } = await supabase
        .from('sound_files')
        .select('id')
        .eq('user_id', userId);

    if (soundsError) {
        console.error('Error fetching user sounds for joins:', soundsError.message);
        return [];
    }
    if (!userSounds || userSounds.length === 0) {
        return [];
    }

    const soundIds = userSounds.map(s => s.id);

    const { data, error } = await supabase
        .from('sound_scene_join')
        .select('sound_id, scene_id, atmosphere')
        .in('sound_id', soundIds);
    
    if (error) {
        console.error('Error fetching sound-scene joins:', error.message);
        return [];
    }
    return data || [];
}

export const updateSoundScenes = async (soundId: string, sceneData: Array<{ scene_id: string; atmosphere: AtmosphereLevel[] | null; }>): Promise<void> => {
    const { error: deleteError } = await supabase
        .from('sound_scene_join')
        .delete()
        .eq('sound_id', soundId);
    
    if (deleteError) {
        console.error('Error clearing sound scenes:', deleteError.message);
        return;
    }

    if (sceneData.length > 0) {
        const relations = sceneData.map(data => ({
            sound_id: soundId,
            scene_id: data.scene_id,
            atmosphere: data.atmosphere
        }));
        const { error: insertError } = await supabase
            .from('sound_scene_join')
            .insert(relations);

        if (insertError) {
            console.error('Error setting sound scenes:', insertError.message);
        }
    }
};

export const deleteOrphanedScenes = async (userId: string): Promise<void> => {
    // 1. Get all sound IDs for the user
    const { data: userSounds, error: soundsError } = await supabase
        .from('sound_files')
        .select('id')
        .eq('user_id', userId);

    if (soundsError || !userSounds) {
        console.error('Error fetching user sounds for cleanup:', soundsError?.message);
        return;
    }
    if (userSounds.length === 0) {
        const { error: deleteAllError } = await supabase.from('scenes').delete().eq('user_id', userId);
        if (deleteAllError) console.error('Error deleting all scenes for user with no sounds:', deleteAllError.message);
        return;
    }
    const soundIds = userSounds.map(s => s.id);

    // 2. Get all scene IDs that are actually used in joins
    const { data: usedSceneJoins, error: joinsError } = await supabase
        .from('sound_scene_join')
        .select('scene_id')
        .in('sound_id', soundIds);
    
    if (joinsError) {
        console.error('Error fetching used scenes for cleanup:', joinsError.message);
        return;
    }
    const usedSceneIds = new Set(usedSceneJoins.map(j => j.scene_id));

    // 3. Get all scene IDs for the user from the scenes table
    const { data: allUserScenes, error: scenesError } = await supabase
        .from('scenes')
        .select('id')
        .eq('user_id', userId);

    if (scenesError || !allUserScenes) {
        console.error('Error fetching scenes for cleanup:', scenesError?.message);
        return;
    }

    // 4. Compare and find orphans
    const orphanedSceneIds = allUserScenes
        .map(s => s.id)
        .filter(id => !usedSceneIds.has(id));

    // 5. Delete orphans
    if (orphanedSceneIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('scenes')
            .delete()
            .in('id', orphanedSceneIds);
        
        if (deleteError) {
            console.error('Error deleting orphaned scenes:', deleteError.message);
        }
    }
};


// --- Sound File Service Functions ---

export const getSoundFiles = async (userId: string): Promise<Sound[]> => {
  const { data, error } = await supabase
    .from('sound_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sound files:', error.message);
    return [];
  }
  
  const soundsWithUrls = data.map(sound => {
    const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(sound.file_path);
    const type = sound.type === 'Sound Effect' ? 'One-shots' : sound.type;
    return { ...sound, publicURL: publicUrl, type };
  });

  return soundsWithUrls as Sound[];
};

export const uploadSoundFile = async (
  userId: string,
  file: File,
  details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes' | 'atmosphere' | 'favorite'> & { sceneNames?: string[], sceneAtmospheres?: Record<string, AtmosphereLevel[] | null> }
): Promise<Sound | null> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('sound-files')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError.message);
    return null;
  }

  const { sceneNames, sceneAtmospheres, ...soundDetails } = details;

  const newSoundData = {
    ...soundDetails,
    user_id: userId,
    file_path: filePath,
    type: details.type === 'One-shots' ? 'Sound Effect' : details.type,
  };

  const { data, error: dbError } = await supabase
    .from('sound_files')
    .insert(newSoundData)
    .select()
    .single();

  if (dbError) {
    console.error('Error inserting sound file metadata:', dbError.message);
    await supabase.storage.from('sound-files').remove([filePath]);
    return null;
  }
  
  if (details.include_in_all_scenes) {
    const { data: allUserScenes, error: scenesError } = await supabase.from('scenes').select('id, name').eq('user_id', userId);
    if (scenesError) {
        console.error('Error fetching all scenes for include_in_all_scenes:', scenesError.message);
    } else if (allUserScenes && allUserScenes.length > 0) {
        const sceneData = allUserScenes.map(scene => ({
            scene_id: scene.id,
            atmosphere: sceneAtmospheres?.[scene.name] || null
        }));
        await updateSoundScenes(data.id, sceneData);
    }
  } else if (sceneNames && sceneNames.length > 0) {
      const scenes = await getOrCreateScenes(userId, sceneNames);
      const sceneData = scenes.map(scene => ({
          scene_id: scene.id,
          atmosphere: sceneAtmospheres?.[scene.name] || null
      }));
      await updateSoundScenes(data.id, sceneData);
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  const type = data.type === 'Sound Effect' ? 'One-shots' : data.type;
  return { ...data, publicURL: publicUrl, scenes: [], type };
};

export const updateSoundFile = async (
  id: string,
  updates: Partial<Omit<Sound, 'scenes' | 'favorite'>> & { sceneNames?: string[], sceneAtmospheres?: Record<string, AtmosphereLevel[] | null> }
): Promise<Sound | null> => {
  const { sceneNames, sceneAtmospheres, ...soundUpdates } = updates as any;
  if (soundUpdates.type === 'One-shots') {
    soundUpdates.type = 'Sound Effect';
  }
  
  const { data: updatedDataArray, error } = await supabase
    .from('sound_files')
    .update(soundUpdates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating sound file:', error.message);
    return null;
  }

  if (!updatedDataArray || updatedDataArray.length === 0) {
    console.error('Failed to update sound file. The record might not exist, or RLS policy may have prevented the update.');
    return null;
  }

  const data = updatedDataArray[0];

  if (sceneNames !== undefined && sceneAtmospheres !== undefined) {
      if (updates.include_in_all_scenes) {
        const { data: allUserScenes, error: scenesError } = await supabase.from('scenes').select('id, name').eq('user_id', data.user_id);
        if (scenesError) {
            console.error('Error fetching all scenes for include_in_all_scenes update:', scenesError.message);
        } else if (allUserScenes) {
            const sceneData = allUserScenes.map(scene => ({
                scene_id: scene.id,
                atmosphere: sceneAtmospheres[scene.name] || null
            }));
            await updateSoundScenes(data.id, sceneData);
        }
      } else {
        const scenes = await getOrCreateScenes(data.user_id, sceneNames);
        const sceneData = scenes.map(scene => ({
            scene_id: scene.id,
            atmosphere: sceneAtmospheres[scene.name] || null
        }));
        await updateSoundScenes(data.id, sceneData);
      }
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  const type = data.type === 'Sound Effect' ? 'One-shots' : data.type;
  return { ...data, publicURL: publicUrl, scenes: [], type };
};

export const deleteSoundFile = async (sound: Sound): Promise<boolean> => {
  const { error: dbError } = await supabase
    .from('sound_files')
    .delete()
    .eq('id', sound.id);

  if (dbError) {
    console.error('Error deleting sound from DB:', dbError.message);
    return false;
  }

  const { error: storageError } = await supabase.storage
    .from('sound-files')
    .remove([sound.file_path]);

  if (storageError) {
    console.error('Error deleting sound from storage:', storageError.message);
    return false;
  }

  return true;
};
