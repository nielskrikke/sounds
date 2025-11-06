
import { supabase } from './supabase';
import { SoundboardPreset, Sound } from '../types';

export const getPresets = async (userId: string): Promise<SoundboardPreset[]> => {
  const { data, error } = await supabase
    .from('soundboard_presets')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching presets:', error);
    return [];
  }
  return data || [];
};

export const createPreset = async (
  userId: string,
  name: string,
  sounds: Sound[]
): Promise<SoundboardPreset | null> => {
  // We only store the sound objects, not the live publicURL
  const soundsToStore = sounds.map(({ publicURL, ...rest }) => rest);

  const { data, error } = await supabase
    .from('soundboard_presets')
    .insert({ user_id: userId, name, sounds: soundsToStore })
    .select()
    .single();

  if (error) {
    console.error('Error creating preset:', error);
    return null;
  }
  return data;
};

export const updatePreset = async (
  id: string,
  updates: { name?: string, sounds?: Sound[] }
): Promise<SoundboardPreset | null> => {
    const updateData: {name?: string, sounds?: any[], updated_at: string} = {
        updated_at: new Date().toISOString()
    };

    if (updates.name) {
        updateData.name = updates.name;
    }
    if (updates.sounds) {
        updateData.sounds = updates.sounds.map(({ publicURL, ...rest }) => rest);
    }
    
    // Do not update if no data is provided to update
    if (Object.keys(updateData).length <= 1) {
        const { data: currentData } = await supabase.from('soundboard_presets').select().eq('id', id).single();
        return currentData;
    }


    const { data, error } = await supabase
        .from('soundboard_presets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating preset:', error);
        return null;
    }
    return data;
};


export const deletePreset = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('soundboard_presets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting preset:', error);
    return false;
  }
  return true;
};
