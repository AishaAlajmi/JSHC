// File: src/lib/storage.js
import { makeSupabase } from "./supabaseClient";

export const UPSERT_KEYS = {
  SCHOOL: "created_by,clinic_name,school_name,entry_date",
  PLACE:  "created_by,facility,place_category,entry_date",
};

/**
 * input shape (school):
 * {
 *   entry_date, facility, clinic_name, school_name,
 *   gender, authority, stage,
 *   vaccinated, refused, absent, not_accounted, school_total,
 *   created_by, location_type: 'school'
 * }
 *
 * input shape (place):
 * {
 *   entry_date, facility, place_category,
 *   vaccinated,
 *   created_by, location_type: 'place'
 * }
 */
export async function submitDailyEntry(input) {
  const supabase = makeSupabase();

  const isPlace = (input.location_type === "place");
  const table = isPlace ? "place_entries" : "daily_entries";
  const onConflict = isPlace ? UPSERT_KEYS.PLACE : UPSERT_KEYS.SCHOOL;

  const today = new Date().toISOString().slice(0, 10);

  const payload = isPlace
    ? {
        entry_date: input.entry_date || today,
        facility: input.facility ?? null,
        place_category: input.place_category ?? null,
        vaccinated: Number(input.vaccinated || 0),
        created_by: input.created_by || input.email || null,
      }
    : {
        entry_date: input.entry_date || today,

        facility: input.facility ?? null,
        clinic_name: input.clinic_name ?? null,
        school_name: input.school_name ?? null,

        gender: input.gender ?? null,
        authority: input.authority ?? null,
        stage: input.stage ?? null,

        vaccinated: Number(input.vaccinated || 0),
        refused: Number(input.refused || 0),
        absent: Number(input.absent || 0),
        not_accounted: Number(input.not_accounted || 0),
        school_total: Number(input.school_total || 0),

        created_by: input.created_by || input.email || null,
      };

  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict, ignoreDuplicates: false })
    .select()
    .single();

  if (error) return { error };
  return { data };
}

/** Read for dashboards. Pass {from,to,facility,locationType} if you want filters */
export async function getEntries({ from, to, facility, locationType } = {}) {
  const supabase = makeSupabase();

  // Prefer the unified view if you created it; else fall back to daily_entries
  let q = supabase.from("combined_entries").select("*");

  if (from) q = q.gte("entry_date", from);
  if (to) q = q.lte("entry_date", to);
  if (facility) q = q.eq("facility", facility);
  if (locationType) q = q.eq("location_type", locationType);

  q = q.order("entry_date", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return { error };
  return { rows: data || [] };
}
