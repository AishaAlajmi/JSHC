// File: src/lib/storage.js
import { makeSupabase } from "./supabaseClient";

export const UPSERT_KEYS = {
  SCHOOL: "created_by,clinic_name,school_name,entry_date",
  PLACE:  "created_by,facility,place_category,entry_date",
};

// Insert/update one row per DAY.
// Chooses the correct unique key based on location_type.
export async function submitDailyEntry(input) {
  const supabase = makeSupabase();

  const isPlace = input.location_type === "place";
  const onConflict = isPlace ? UPSERT_KEYS.PLACE : UPSERT_KEYS.SCHOOL;
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    entry_date: input.entry_date || today,

    facility: input.facility ?? null,
    region: input.region ?? null, // keep if your table has it

    // SCHOOL fields only (null for places)
    clinic_name: isPlace ? null : (input.clinic_name ?? null),
    school_name: isPlace ? null : (input.school_name ?? null),

    // PLACE fields only (null for schools)
    location_type: isPlace ? "place" : "school",
    place_category: isPlace ? (input.place_category ?? null) : null,

    // fixed meta (schools only)
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

export async function getEntries({ from, to, facility, locationType } = {}) {
  const supabase = makeSupabase();
  let q = supabase.from("daily_entries").select("*");

  if (from) q = q.gte("entry_date", from);
  if (to) q = q.lte("entry_date", to);
  if (facility) q = q.eq("facility", facility);
  if (locationType) q = q.eq("location_type", locationType);

  q = q.order("entry_date", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return { error };
  return { rows: data || [] };
}
