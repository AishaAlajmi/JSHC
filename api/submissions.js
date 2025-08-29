// /api/submissions.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const {
      facility,
      clinic_name,
      school_name,
      gender,
      authority,
      stage,
      vaccinated,
      refused,
      absent,
      not_accounted,
      school_total,
      region,
      created_by,
    } = req.body || {};

    // basic validation
    if (!facility || !school_name) {
      return res.status(400).json({ error: 'facility and school_name are required' });
    }

    // coerce numbers safely
    const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    const { data, error } = await supabase
      .from('daily_entries')
      .insert([{
        facility,
        clinic_name,
        school_name,
        gender,
        authority,
        stage,
        vaccinated:    toInt(vaccinated),
        refused:       toInt(refused),
        absent:        toInt(absent),
        not_accounted: toInt(not_accounted),
        school_total:  toInt(school_total),
        region:        region || null,
        created_by:    created_by || null
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Insert failed' });
  }
}
