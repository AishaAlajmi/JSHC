// src/lib/storage.js
export async function submitDailyEntry(row) {
  const res = await fetch('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save entry');
  }
  return res.json();
}

// NEW: fetch entries from Supabase via our API route
export async function getEntries(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch('/api/entries' + (qs ? `?${qs}` : ''));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load entries');
  }
  return res.json(); // { rows }
}
