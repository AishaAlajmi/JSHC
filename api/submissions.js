
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function toInt(n, def = 0) {
  const v = Number.parseInt(n, 10);
  return Number.isFinite(v) && v >= 0 ? v : def;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const b = req.body ?? {};
      const row = {
        facility: String(b.facility || '').trim(),
        clinic_name: String(b.clinic_name || '').trim(),
        school_name: String(b.school_name || '').trim(),
        gender: String(b.gender || 'غير محدد').trim(),
        authority: String(b.authority || '').trim(),
        stage: String(b.stage || '').trim(),
        vaccinated: toInt(b.vaccinated),
        refused: toInt(b.refused),
        absent: toInt(b.absent),
        not_accounted: toInt(b.not_accounted),
        school_total: toInt(b.school_total),
        region: String(b.region || '').trim(),
        created_by: String(b.created_by || '').trim()
      };

      if (!row.facility || !row.school_name) {
        res.status(400).json({ error: 'facility and school_name are required' });
        return;
      }

      const { data, error } = await supabase.from('daily_entries').insert([row]).select().single();
      if (error) throw error;
      res.status(201).json(data);
      return;
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('daily_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      res.status(200).json(data);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API /api/submissions error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
