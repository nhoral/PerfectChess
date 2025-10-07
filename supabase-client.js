// ========================================
// Supabase Client Setup (Guest Access)
// ========================================

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn if using fallback values
if (!import.meta.env.VITE_SUPABASE_URL) {
    console.warn('⚠️ Using hardcoded Supabase credentials. Create a .env file for production!');
}

// Create and export Supabase client (auth disabled for guest access)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Don't persist auth sessions
    autoRefreshToken: false
  }
});

