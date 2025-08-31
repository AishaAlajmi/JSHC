// File: src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** Returns a Supabase client or null (does NOT throw). */
export function makeSupabase() {
  if (!URL || !KEY) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    return null;
  }
  return createClient(URL, KEY, {
    auth: { persistSession: false },
  });
}

export const hasSupabaseEnv = () => Boolean(URL && KEY);
