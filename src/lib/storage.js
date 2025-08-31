// src/lib/storage.js

// Optional: choose how the server should upsert
export const UPSERT_MODES = {
  PER_PAIR: "pair",        // unique on (created_by, clinic_name, school_name)
  PER_DAY: "per_day",      // unique on (created_by, clinic_name, school_name, entry_date)
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Submit (UPSERT) a daily entry.
 * - Ensures `entry_date` is present (defaults to today or `row.date`).
 * - Sends a hint `_upsert` so the API can decide onConflict target.
 *
 * @param {Object} row
 * @param {Object} [opts]
 * @param {'pair'|'per_day'} [opts.mode='per_day']
 */
export async function submitDailyEntry(row, { mode = UPSERT_MODES.PER_DAY } = {}) {
  const payload = {
    ...row,
    entry_date: row.entry_date || row.date || todayStr(),
    _upsert: mode,
  };

  const res = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save entry");
  }
  return res.json();
}

/**
 * Load entries (server can accept filters like created_by, date range, etc.)
 * Returns { rows }
 */
export async function getEntries(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch("/api/entries" + (qs ? `?${qs}` : ""));

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load entries");
  }
  return res.json(); // { rows }
}
