
import { supabase } from './supabase';
import { Sound } from '../types';
import { v4 as uuidv4 } from 'https://aistudiocdn.com/uuid@^13.0.0';

export const getSoundFiles = async (userId: string): Promise<Sound[]> => {
  const { data, error } = await supabase
    .from('sound_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sound files:', error);
    return [];
  }
  
  const soundsWithUrls = data.map(sound => {
    const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(sound.file_path);
    return { ...sound, publicURL: publicUrl };
  });

  return soundsWithUrls;
};

export const uploadSoundFile = async (
  userId: string,
  file: File,
  details: Omit<Sound, 'id' | 'user_id' | 'file_path' | 'publicURL' | 'created_at'>
): Promise<Sound | null> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('sound-files')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  const newSoundData = {
    ...details,
    user_id: userId,
    file_path: filePath,
  };

  const { data, error: dbError } = await supabase
    .from('sound_files')
    .insert(newSoundData)
    .select()
    .single();

  if (dbError) {
    console.error('Error inserting sound file metadata:', dbError);
    // Attempt to clean up storage if db insert fails
    await supabase.storage.from('sound-files').remove([filePath]);
    return null;
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  return { ...data, publicURL: publicUrl };
};

export const updateSoundFile = async (
  id: string,
  updates: Partial<Sound>
): Promise<Sound | null> => {
  const { data, error } = await supabase
    .from('sound_files')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating sound file:', error);
    return null;
  }
  
  const { data: { publicUrl } } = supabase.storage.from('sound-files').getPublicUrl(data.file_path);
  return { ...data, publicURL: publicUrl };
};

export const deleteSoundFile = async (sound: Sound): Promise<boolean> => {
  // First, delete from database
  const { error: dbError } = await supabase
    .from('sound_files')
    .delete()
    .eq('id', sound.id);

  if (dbError) {
    console.error('Error deleting sound from DB:', dbError);
    return false;
  }

  // Then, delete from storage
  const { error: storageError } = await supabase.storage
    .from('sound-files')
    .remove([sound.file_path]);

  if (storageError) {
    console.error('Error deleting sound from storage:', storageError);
    // The DB record is gone, but the file remains. This is a partial failure.
    return false;
  }

  return true;
};