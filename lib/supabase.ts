import { createClient } from '@supabase/supabase-js';

// Hardcoding Supabase credentials as the app is served statically without a build process
// to handle environment variables. The public anon key is safe to expose client-side.
const supabaseUrl = 'https://gvamzplwuirxggtyobxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2YW16cGx3dWlyeGdndHlvYnhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDYzODUsImV4cCI6MjA3NjEyMjM4NX0.Eb1oxz76Pe2CfeYihOJtoFSicJeNHfJGIbtTosP1Knc';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
