// src/lib/storage.js
import { makeSupabase } from "./supabaseClient";

const today = () => new Date().toISOString().slice(0, 10);

// Insert one row into daily_entries (works for school and place)
export async function submitDailyEntry(input) {
  const supabase = makeSupabase();
  if (!supabase) return { error: { message: "Supabase env not configured" } };

  const isPlace = (input.location_type || "").toLowerCase() === "place";

  const payload = {
    entry_date: input.entry_date || input.date || today(),
    facility: input.facility ?? null,

    // school fields
    clinic_name: isPlace ? null : (input.clinic_name ?? null),
    school_name: isPlace ? null : (input.school_name ?? null),
    gender:      isPlace ? null : (input.gender ?? null),
    authority:   isPlace ? null : (input.authority ?? null),
    stage:       isPlace ? null : (input.stage ?? null),
    vaccinated:        Number(input.vaccinated || 0),
    refused:     isPlace ? 0 : Number(input.refused || 0),
    absent:      isPlace ? 0 : Number(input.absent || 0),
    not_accounted: isPlace ? 0 : Number(input.not_accounted || 0),
    school_total:  isPlace ? 0 : Number(input.school_total || 0),

    // place fields
    location_type: isPlace ? "place" : "school",
    place_category: isPlace ? (input.place_category || input.place || null) : null,

    created_by: input.created_by || input.email || null,
  };

  // Simple INSERT (no upsert) – works even if you haven't created UNIQUE indexes yet
  const { data, error } = await supabase
    .from("daily_entries")
    .insert([payload])
    .select()
    .single();

  if (error) return { error };
  return { data };
}

export async function getEntries({ from, to, facility, locationType } = {}) {
  const supabase = makeSupabase();
  if (!supabase) return { rows: [] };

  let q = supabase.from("daily_entries").select("*");

  if (from)        q = q.gte("entry_date", from);
  if (to)          q = q.lte("entry_date", to);
  if (facility)    q = q.eq("facility", facility);
  if (locationType)q = q.eq("location_type", locationType);

  q = q.order("entry_date", { ascending: false })
       .order("created_at", { ascending: false });

  const { data, error } = await q;
  if (error) return { error };
  return { rows: data || [] };
}
