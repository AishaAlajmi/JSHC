import { supabase } from "./supabaseClient";

/** Insert a daily entry (multiple rows allowed). */
export async function submitDailyEntry(input) {
  const { data, error } = await supabase
    .from("daily_entries")
    .insert(input)
    .select()
    .single();
  return { data, error };
}

/** Sum today's totals for a given (user + facility + center + school). */
export async function fetchSchoolDayTotals({
  created_by,
  facility,
  clinic_name,
  school_name,
  entry_date, // "YYYY-MM-DD"
}) {
  const { data, error } = await supabase
    .from("daily_entries")
    .select("vaccinated, refused, absent")
    .eq("created_by", created_by)
    .eq("facility", facility)
    .eq("clinic_name", clinic_name)
    .eq("school_name", school_name)
    .eq("entry_date", entry_date);

  if (error) return { data: { vaccinated: 0, refused: 0, absent: 0 }, error };

  const totals = (data || []).reduce(
    (acc, row) => {
      acc.vaccinated += Number(row.vaccinated) || 0;
      acc.refused    += Number(row.refused)    || 0;
      acc.absent     += Number(row.absent)     || 0;
      return acc;
    },
    { vaccinated: 0, refused: 0, absent: 0 }
  );

  return { data: totals, error: null };
}

/** Fetch entries (admin sees all; user filtered by created_by if passed). */
export async function getEntries(params = {}) {
  let q = supabase.from("daily_entries").select("*");
  if (params.created_by) q = q.eq("created_by", params.created_by);
  const { data, error } = await q.order("entry_date", { ascending: false }).limit(2000);
  return { rows: data || [], error };
}
