// ========================================
// Supabase Client Setup (Guest Access)
// ========================================

import { createClient } from '@supabase/supabase-js';

// Get credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wpnsxanwwunzecurjsfd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbnN4YW53d3VuemVjdXJqc2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3Njc4MDIsImV4cCI6MjA3NTM0MzgwMn0.qF_SWFkgXpwx03U5_URbZDJnP8YRiAGcJTw9bPZ6Wco';

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

