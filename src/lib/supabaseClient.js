// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client from Vite env.
 * Returns null (not throws) if env keys are missing so UI can show a friendly message.
 */
export function makeSupabase() {
  const url = import.meta.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    return null;
  }
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { "x-app": "hpv" } },
  });
}
