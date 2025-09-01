// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (Vite injects envs at build time).
 * Requires:
 *  - VITE_SUPABASE_URL
 *  - VITE_SUPABASE_ANON_KEY
 */
export function makeSupabase() {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !anon) {
        console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
        return null;
    }

    return createClient(url, anon);
}
