// /api/submissions.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[submissions] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey); // server-only

// read JSON body safely (حتى لو body فاضي)
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const orNull = (v) => (v === '' || v === undefined || v === null ? null : v);
const clean = (v) => (typeof v === 'string' ? v.trim() : v);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await readJson(req);

    // اجعل الافتراضي "pair" ليتطابق مع القيّد الفريد لديك
    const upsertMode = body?._upsert === 'per_day' ? 'per_day' : 'pair';
    const onConflict =
      upsertMode === 'pair'
        ? 'created_by,clinic_name,school_name'
        : 'created_by,clinic_name,school_name,entry_date';

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
      entry_date,
    } = body || {};

    // تنظيف النصوص (trim) لتفادي اختلاف المسافات
    const facilityC = clean(facility);
    const clinicC   = clean(clinic_name);
    const schoolC   = clean(school_name);
    const authorC   = clean(authority);
    const stageC    = clean(stage);
    const genderC   = clean(gender);
    const regionC   = clean(region);
    const createdC  = clean(created_by);

    if (!facilityC || !clinicC || !schoolC) {
      return res.status(400).json({ error: 'facility, clinic_name, and school_name are required' });
    }

    const payload = {
      facility: orNull(facilityC),
      clinic_name: orNull(clinicC),
      school_name: orNull(schoolC),
      gender: orNull(genderC),
      authority: orNull(authorC),
      stage: orNull(stageC),
      vaccinated: toInt(vaccinated),
      refused: toInt(refused),
      absent: toInt(absent),
      not_accounted: toInt(not_accounted),
      school_total: toInt(school_total),
      region: orNull(regionC),
      created_by: orNull(createdC),
      entry_date: (entry_date || body?.date || todayStr()),
    };

    // المحاولة الأساسية: UPSERT على نفس الأعمدة الفريدة
    let upsert = await supabase
      .from('daily_entries')
      .upsert(payload, { onConflict, ignoreDuplicates: false })
      .select('*')
      .single();

    if (upsert.error) {
      // fallback: في حال تعارض فريد (23505) نحاول UPDATE يدويًا على الأعمدة الفريدة
      const pgCode = upsert.error?.code || upsert.error?.details || '';
      const looksLikeUnique = `${pgCode}`.includes('23505') || `${upsert.error?.message}`.includes('duplicate key');

      if (looksLikeUnique) {
        // نبني WHERE مطابق للوضع
        let q = supabase.from('daily_entries')
          .update(payload)
          .eq('created_by', payload.created_by)
          .eq('clinic_name', payload.clinic_name)
          .eq('school_name', payload.school_name);

        if (upsertMode === 'per_day') {
          q = q.eq('entry_date', payload.entry_date);
        }

        const upd = await q.select('*').single();
        if (upd.error) throw upd.error;
        return res.status(200).json(upd.data);
      }

      // لو كان خطأ آخر، نرميه
      throw upsert.error;
    }

    return res.status(200).json(upsert.data);
  } catch (e) {
    console.error('[submissions] Upsert failed:', e);
    return res.status(500).json({ error: e.message || 'Upsert failed' });
  }
}
