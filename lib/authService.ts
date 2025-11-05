

import { supabase } from './supabase';

const toEmail = (username: string) => `${username.toLowerCase().trim()}@soundboard.local`;

export const signInWithUsername = async (username: string, password: string) => {
  const email = toEmail(username);

  // First, try to sign in
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If user does not exist, sign them up automatically
  if (error && (error.message.includes('Invalid login credentials') || error.message.includes('User not found'))) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim(),
        },
      },
    });
    
    if (signUpError) {
      return { user: null, session: null, error: signUpError };
    }
    
    // After sign up, create a user profile entry
    if(signUpData.user) {
        await supabase.from('users').insert({ id: signUpData.user.id, username: username.trim() });
    }

    return { user: signUpData.user, session: signUpData.session, error: null };
  }

  return { user: data.user, session: data.session, error };
};


export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}