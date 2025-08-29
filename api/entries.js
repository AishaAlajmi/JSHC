// /api/entries.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only
);

// GET /api/entries?created_by=email@x.com&facility=...&from=YYYY-MM-DD&to=YYYY-MM-DD
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const created_by = url.searchParams.get('created_by');
    const facility = url.searchParams.get('facility');

    let q = supabase
      .from('daily_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (created_by) q = q.eq('created_by', created_by);
    if (facility) q = q.eq('facility', facility);
    if (from) q = q.gte('created_at', `${from}T00:00:00Z`);
    if (to) q = q.lte('created_at', `${to}T23:59:59Z`);

    const { data, error } = await q;
    if (error) throw error;

    res.status(200).json({ rows: data });
  } catch (e) {
    console.error('[entries] fetch failed:', e);
    res.status(500).json({ error: e.message || 'Failed to load entries' });
  }
}
