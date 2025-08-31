// src/lib/storage.js
import { makeSupabase } from "./supabaseClient";

export const UPSERT_KEYS = {
  SCHOOL: "created_by,clinic_name,school_name,entry_date",
  PLACE:  "created_by,facility,place_category,entry_date",
};

/**
 * Insert/Upsert one daily entry (school or place).
 * Returns { data } or { error } shape.
 */
export async function submitDailyEntry(input) {
  const supabase = makeSupabase();
  if (!supabase) {
    return { error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const isPlace = (input.location_type || "").toLowerCase() === "place";
  const onConflict = isPlace ? UPSERT_KEYS.PLACE : UPSERT_KEYS.SCHOOL;

  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    entry_date: input.entry_date || today,

    facility: input.facility ?? null,
    region: input.region ?? null,

    // school vs place
    location_type: isPlace ? "place" : "school",
    place_category: isPlace ? (input.place_category ?? null) : null,

    clinic_name: isPlace ? null : (input.clinic_name ?? null),
    school_name: isPlace ? null : (input.school_name ?? null),

    gender: isPlace ? null : (input.gender ?? null),
    authority: isPlace ? null : (input.authority ?? null),
    stage: isPlace ? null : (input.stage ?? null),

    vaccinated: Number(input.vaccinated || 0),
    refused: isPlace ? 0 : Number(input.refused || 0),
    absent:  isPlace ? 0 : Number(input.absent || 0),
    not_accounted: isPlace ? 0 : Number(input.not_accounted || 0),
    school_total:  isPlace ? 0 : Number(input.school_total || 0),

    created_by: input.created_by || input.email || null,
  };

  const { data, error } = await supabase
    .from("daily_entries")
    .upsert(payload, { onConflict, ignoreDuplicates: false })
    .select()
    .single();

  if (error) return { error };
  return { data };
}

/**
 * Simple reader with optional filters.
 */
export async function getEntries({ from, to, facility, locationType, created_by } = {}) {
  const supabase = makeSupabase();
  if (!supabase) {
    return { rows: [], error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  let q = supabase.from("daily_entries").select("*");
  if (from) q = q.gte("entry_date", from);
  if (to) q = q.lte("entry_date", to);
  if (facility) q = q.eq("facility", facility);
  if (locationType) q = q.eq("location_type", locationType);
  if (created_by) q = q.eq("created_by", created_by);

  q = q.order("entry_date", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return { rows: [], error };
  return { rows: data || [] };
}
