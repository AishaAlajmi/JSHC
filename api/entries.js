import { createClient } from '@supabase/supabase-js';
const supabase2 = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ error: 'Method Not Allowed' }); return; }
  try {
    const { from = '', to = '', region = '', facility = '' } = req.query;
    let q = supabase2.from('daily_entries').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    if (region) q = q.eq('region', region);
    if (facility) q = q.eq('facility', facility);
    const { data, count, error } = await q.limit(1000);
    if (error) throw error;
    res.status(200).json({ rows: data, count });
  } catch (e) {
    console.error('API /api/entries error', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

