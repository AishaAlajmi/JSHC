// /api/submissions.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[submissions] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey); // server-only

// Helper: robust JSON body reader (works even when req.body is empty)
async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    try { return JSON.parse(raw); } catch { return {}; }
}

// Small helpers
const todayStr = () => new Date().toISOString().slice(0, 10);
const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const orNull = (v) => (v === '' || v === undefined ? null : v);

export default async function handler(req, res) {
    // permissive CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = await readJson(req);

        // hint from client to choose conflict target; defaults to per-day history
        const upsertMode = body?._upsert === 'pair' ? 'pair' : 'per_day';

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
            entry_date, // may be provided by client; else we will derive it
            // ignore other fields safely
        } = body || {};

        // Basic validations
        if (!facility || !clinic_name || !school_name) {
            return res.status(400).json({ error: 'facility, clinic_name, and school_name are required' });
        }

        const payload = {
            facility: orNull(facility),
            clinic_name: orNull(clinic_name),
            school_name: orNull(school_name),
            gender: orNull(gender),
            authority: orNull(authority),
            stage: orNull(stage),
            vaccinated: toInt(vaccinated),
            refused: toInt(refused),
            absent: toInt(absent),
            not_accounted: toInt(not_accounted),
            school_total: toInt(school_total),
            region: orNull(region),
            created_by: orNull(created_by),
            entry_date: (entry_date || body?.date || todayStr()), // ensure a stable date column
        };

        // Decide unique target for upsert
        const onConflict =
            upsertMode === 'pair'
                ? 'created_by,clinic_name,school_name'
                : 'created_by,clinic_name,school_name,entry_date';

        // Perform UPSERT
        const { data, error } = await supabase
            .from('daily_entries')
            .upsert(payload, { onConflict, ignoreDuplicates: false })
            .select('*')
            .single();

        if (error) {
            // Common cause: missing unique index matching `onConflict`
            // Surface the message so you can add the constraint.
            throw error;
        }

        return res.status(200).json(data);
    } catch (e) {
        console.error('[submissions] Upsert failed:', e);
        return res.status(500).json({ error: e.message || 'Upsert failed' });
    }
}
