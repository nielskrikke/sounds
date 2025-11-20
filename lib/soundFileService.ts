
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

export const addScene = async (userId: string, name: string): Promise<Scene | null> => {
    // 1. Create Scene
    const { data: scene, error } = await supabase
        .from('scenes')
        .insert({ name: name.trim(), user_id: userId })
        .select()
        .single();
    
    if (error) {
        console.error('Error adding scene:', error.message);
        return null;
    }

    // 2. Find sounds that should be included in all scenes
    const { data: globalSounds } = await supabase
        .from('sound_files')
        .select('id')
        .eq('user_id', userId)
        .eq('include_in_all_scenes', true);
    
    // 3. Create joins for these global sounds to the new scene
    if (globalSounds && globalSounds.length > 0) {
        const newJoins = globalSounds.map(s => ({
            sound_id: s.id,
            scene_id: scene.id,
            atmosphere: [] as AtmosphereLevel[] // Default to no specific atmosphere, user can configure later
        }));
        
        const { error: joinError } = await supabase
            .from('sound_scene_join')
            .insert(newJoins);
            
        if (joinError) {
             console.error('Error auto-linking global sounds to new scene:', joinError.message);
        }
    }

    return scene;
};

export const removeScene = async (sceneId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Delete joins first
    const { error: joinError } = await supabase
        .from('sound_scene_join')
        .delete()
        .eq('scene_id', sceneId);
        
    if (joinError) {
        console.error('Error deleting scene joins:', joinError.message);
        return { success: false, error: `Failed to detach sounds: ${joinError.message}` };
    }

    // 2. Delete the scene
    const { error, count } = await supabase
        .from('scenes')
        .delete({ count: 'exact' })
        .eq('id', sceneId)
        .eq('user_id', userId);

    if (error) {
        console.error('Error deleting scene:', error.message);
        return { success: false, error: error.message };
    }
    
    if (count === 0) {
        return { success: false, error: "Scene not found or access denied." };
    }

    return { success: true };
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
    // Delete existing joins
    const { error: deleteError } = await supabase
        .from('sound_scene_join')
        .delete()
        .eq('sound_id', soundId);
    
    if (deleteError) {
        console.error('Error clearing sound scenes:', deleteError.message);
        return;
    }

    // Insert new joins
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
  details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at' | 'scenes' | 'favorite'> & { sceneIds: string[], sceneAtmospheres: Record<string, AtmosphereLevel[] | null> }
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

  const { sceneIds, sceneAtmospheres, ...rest } = details;
  
  const dbInsertData = {
      user_id: userId,
      file_path: filePath,
      name: details.name,
      type: details.type === 'One-shots' ? 'Sound Effect' : details.type,
      volume: details.volume,
      loop: details.loop,
      include_in_all_scenes: details.include_in_all_scenes,
      category_tag: details.category_tag,
      mood_tag: details.mood_tag,
      location_tag: details.location_tag,
      type_tag: details.type_tag,
      atmosphere: details.atmosphere // Include global atmosphere
  };

  const { data, error: dbError } = await supabase
    .from('sound_files')
    .insert(dbInsertData)
    .select()
    .single();

  if (dbError) {
    console.error('Error inserting sound file metadata:', dbError.message);
    await supabase.storage.from('sound-files').remove([filePath]);
    return null;
  }
  
  // Handle Scenes and Atmosphere
  if (sceneIds && sceneIds.length > 0) {
      const sceneData = sceneIds.map(sceneId => ({
          scene_id: sceneId,
          atmosphere: sceneAtmospheres?.[sceneId] || null
      }));
      await updateSoundScenes(data.id, sceneData);
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  const type = data.type === 'Sound Effect' ? 'One-shots' : data.type;
  return { ...data, publicURL: publicUrl, scenes: [], type };
};

export const updateSoundFile = async (
  id: string,
  updates: Partial<Omit<Sound, 'scenes' | 'favorite'>> & { sceneIds?: string[], sceneAtmospheres?: Record<string, AtmosphereLevel[] | null> }
): Promise<Sound | null> => {
  
  const allowedFields = [
      'name', 
      'type', 
      'volume', 
      'loop', 
      'include_in_all_scenes', 
      'category_tag', 
      'mood_tag', 
      'location_tag', 
      'type_tag',
      'atmosphere' // Add to allowed fields
  ];

  const dbUpdates: any = {};
  const updatesAny = updates as any;

  allowedFields.forEach(field => {
      if (updatesAny[field] !== undefined) {
          if (field === 'type' && updatesAny[field] === 'One-shots') {
              dbUpdates[field] = 'Sound Effect';
          } else {
              dbUpdates[field] = updatesAny[field];
          }
      }
  });

  let data = null;
  if (Object.keys(dbUpdates).length > 0) {
      const { data: updatedDataArray, error } = await supabase
        .from('sound_files')
        .update(dbUpdates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating sound file:', error.message);
        return null;
      }
      data = updatedDataArray?.[0];
  } else {
      const { data: currentData, error } = await supabase
          .from('sound_files')
          .select()
          .eq('id', id)
          .single();
      if (!error) data = currentData;
  }

  if (!data) return null;

  if (updates.sceneIds !== undefined && updates.sceneAtmospheres !== undefined) {
      const sceneData = updates.sceneIds.map((sceneId: string) => ({
        scene_id: sceneId,
        atmosphere: updates.sceneAtmospheres?.[sceneId] || null
    }));
    await updateSoundScenes(data.id, sceneData);
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  const type = data.type === 'Sound Effect' ? 'One-shots' : data.type;
  return { ...data, publicURL: publicUrl, scenes: [], type };
};

export const deleteSoundFile = async (sound: Sound): Promise<{ success: boolean; error?: string }> => {
  // 1. Delete sound_scene_join records first
  const { error: joinError } = await supabase
    .from('sound_scene_join')
    .delete()
    .eq('sound_id', sound.id);

  if (joinError) {
      console.error('Error deleting sound scene joins:', joinError.message);
  }

  // 2. Delete the sound file record from DB
  const { error: dbError } = await supabase
    .from('sound_files')
    .delete()
    .eq('id', sound.id);

  if (dbError) {
    console.error('Error deleting sound from DB:', dbError.message);
    return { success: false, error: `Database error: ${dbError.message} (Code: ${dbError.code})` };
  }

  // 3. Delete the actual file from storage
  const { error: storageError } = await supabase.storage
    .from('sound-files')
    .remove([sound.file_path]);

  if (storageError) {
    console.error('Error deleting sound from storage:', storageError.message);
  }

  return { success: true };
};
