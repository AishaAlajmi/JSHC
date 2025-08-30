// /api/submissions.js
import { createClient } from "@supabase/supabase-js";

/** ───────────────────  Env & Supabase  ─────────────────── */
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabase = null;
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
        "[submissions] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
} else {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
}

/** ───────────────────  Utils  ─────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10);
const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const orNull = (v) => (v === "" || v === undefined ? null : v);

async function readJson(req) {
    // If a body parser already ran (e.g., Next.js default), use it.
    if (req.body && typeof req.body === "object") return req.body;

    // Otherwise read raw stream safely.
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = chunks.length ? Buffer.concat(chunks).toString("utf8") : "";
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

/** ───────────────────  Handler  ─────────────────── */
export default async function handler(req, res) {
    // CORS (permissive)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

    if (req.method === "OPTIONS") {
        // Always return JSON so client .json() never throws
        res.status(200).setHeader("Content-Type", "application/json");
        return res.end("{}");
    }

    if (req.method !== "POST") {
        res.status(405).setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ error: "Method not allowed" }));
    }

    res.setHeader("Content-Type", "application/json");

    if (!supabase) {
        return res
            .status(500)
            .end(JSON.stringify({ error: "Supabase not configured on server" }));
    }

    try {
        const body = await readJson(req);

        // Optional hint from client
        const upsertMode = body?._upsert === "pair" ? "pair" : "per_day";

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
            entry_date, // optional
        } = body || {};

        if (!facility || !clinic_name || !school_name) {
            return res
                .status(400)
                .end(
                    JSON.stringify({
                        error: "facility, clinic_name, and school_name are required",
                    })
                );
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
            entry_date: entry_date || body?.date || todayStr(),
        };

        // Must match a UNIQUE INDEX in your database
        const onConflict =
            upsertMode === "pair"
                ? "created_by,clinic_name,school_name"
                : "created_by,clinic_name,school_name,entry_date";

        const { data, error } = await supabase
            .from("daily_entries")
            .upsert(payload, { onConflict, ignoreDuplicates: false })
            .select("*")
            .single();

        if (error) throw error;

        return res.status(200).end(JSON.stringify(data || {}));
    } catch (e) {
        console.error("[submissions] Upsert failed:", e);
        return res
            .status(500)
            .end(JSON.stringify({ error: e.message || "Upsert failed" }));
    }
}

/**
 * Next.js only: if this file runs as pages/api or app/api route (node runtime),
 * disable the default body parser so our readJson never conflicts.
 * Safe to keep even if not on Next.js.
 */
export const config = { api: { bodyParser: false } };
