export async function submitDailyEntry(input) {
  const res = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Submit failed: ${res.status}`); }
  return res.json();
}

export async function getEntries(params = {}) {
  const url = new URL('/api/entries', window.location.origin);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v)); });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Load entries failed: ${res.status}`);
  return res.json();
}

