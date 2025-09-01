// Works in production deployments (Vite/React on Vercel)
// Reads client envs that Vite injects at build-time.
import { createClient } from '@supabase/supabase-js';

export function makeSupabase() {
    // Browser bundle (Vite) – this is what your deployed site uses
    const url = import.meta.env?.SUPABASE_URL;
    const anon = import.meta.env?.SUPABASE_ANON_KEY;

    // If these are missing in production, the build didn't have envs set.
    if (!url || !anon) {
        // Do NOT return null in production — surface a clear error
        console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY at build time.');
        throw new Error('Supabase env not configured'); // (keeps original message consistent)
    }

    return createClient(url, anon);
}
