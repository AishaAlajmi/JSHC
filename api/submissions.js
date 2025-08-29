// /api/submissions.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
        '[submissions] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.'
    );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey); // server-only

// Helper: robust JSON body reader (works even when req.body is empty)
async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export default async function handler(req, res) {
    // (Optional) very lenient same-origin CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const body = await readJson(req);

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
        } = body || {};

        if (!facility || !school_name) {
            return res
                .status(400)
                .json({ error: 'facility and school_name are required' });
        }

        const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

        const payload = {
            facility,
            clinic_name,
            school_name,
            gender: gender || null,
            authority: authority || null,
            stage: stage || null,
            vaccinated: toInt(vaccinated),
            refused: toInt(refused),
            absent: toInt(absent),
            not_accounted: toInt(not_accounted),
            school_total: toInt(school_total),
            region: region || null,
            created_by: created_by || null,
        };

        const { data, error } = await supabase
            .from('daily_entries')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        res.status(200).json(data);
    } catch (e) {
        console.error('[submissions] Insert failed:', e);
        res.status(500).json({ error: e.message || 'Insert failed' });
    }
}
