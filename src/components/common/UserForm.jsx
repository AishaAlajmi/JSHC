// File: src/components/common/UserForm.jsx
import React, { useEffect, useState, useMemo } from "react";
import { submitDailyEntry } from "../../lib/storage";
import { getSchoolStatic } from "../../data/meta"; // <- fetch fixed info

const DEBUG = true;
const log = (...args) => {
  if (DEBUG) console.log("[UserForm]", ...args);
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function numberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ---------- Reusable UI ---------- */
function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`p-5 rounded-2xl shadow bg-white ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <div className="text-base font-bold">{title}</div>}
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function Badge({ children, tone = "brand" }) {
  const toneClass =
    tone === "ok"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warn"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : tone === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-sky-50 text-sky-700 border-sky-200";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${toneClass}`}
    >
      {children}
    </span>
  );
}

function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-[95%] md:w-[760px] max-h-[85vh] overflow-auto">
        <div
          className="h-1.5 w-full rounded-t-2xl"
          style={{
            background: "linear-gradient(90deg,var(--brand),var(--brand-dark))",
          }}
        />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="font-extrabold text-lg"
              style={{ color: "var(--brand-dark)" }}
            >
              {title}
            </div>
            <button className="ml-auto btn btn-ghost" onClick={onClose}>
              إغلاق
            </button>
          </div>
          {children}
          {actions && (
            <div className="mt-4 flex gap-2 justify-end">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Form ---------- */
export default function UserForm({
  email,
  facility,
  meta,
  onSubmit,
  schoolInfo,
}) {
  const centers = meta?.centersByFacility?.[facility] || [];
  const [center, setCenter] = useState(centers[0] || "");
  const schools = meta
    ? meta.schoolsByCenter?.[facility + "::" + center] || []
    : [];
  const [school, setSchool] = useState("");
  const [vaccinated, setVaccinated] = useState("");
  const [refused, setRefused] = useState("");
  const [absent, setAbsent] = useState("");
  const [status, setStatus] = useState({ type: "idle", msg: "" });
  const [preview, setPreview] = useState(null);

  // Local component styling (Arabic-friendly)
  const brandStyles = useMemo(
    () => (
      <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
      .hpv-form, .hpv-form * { font-family: "Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important; }
      .hpv-input, .hpv-select { border-radius: .9rem; padding: .75rem 1rem; border: 1px solid #e5e7eb; background:#fff; transition: border-color .15s, box-shadow .15s, background .15s; }
      .hpv-input[disabled], .hpv-select[disabled] { background:#f3f4f6; color:#6b7280; }
      .hpv-input:focus, .hpv-select:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px #3AC0C326; }
      .hpv-label { font-size:.85rem; color:#374151; margin-bottom:.35rem; }
      .hpv-btn-primary { border-radius:1rem; padding:.75rem 1.2rem; color:#fff; background: linear-gradient(135deg,var(--brand),var(--brand-dark)); box-shadow: 0 6px 16px rgba(22,145,208,.25); transition: transform .15s, box-shadow .15s, filter .15s, background .15s; }
      .hpv-btn-primary:hover { background: linear-gradient(135deg,var(--brand-dark),var(--brand)); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(18,111,167,.28); }
      .hpv-btn-ghost { border-radius:1rem; padding:.75rem 1.2rem; background:#fff; border:1px solid #e5e7eb; color:#374151; }
      .hpv-btn-ghost:hover { background:#f9fafb; border-color:#d1d5db; }
      .hpv-help { font-size:.75rem; color:#6b7280; }
      .hpv-section-title { display:flex; align-items:center; gap:.5rem; font-weight:800; color:var(--brand-dark); }
      .hpv-section-title .dot { width:.6rem; height:.6rem; border-radius:999px; background:var(--brand); display:inline-block; }
    `}</style>
    ),
    []
  );

  // keep center valid for current facility
  useEffect(() => {
    setCenter((curr) => (centers.includes(curr) ? curr : centers[0] || ""));
  }, [facility, meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // default the first school whenever center changes
  useEffect(() => {
    const s =
      (meta?.schoolsByCenter?.[facility + "::" + center] || [""])[0] || "";
    setSchool(s);
  }, [center, facility, meta]);

  // Auto-fill “الحقول الثابتة” from meta; fallback to schoolInfo (if provided)
  const fixedMeta = useMemo(
    () => getSchoolStatic(facility, center, school),
    [facility, center, school]
  );

  const fixed = useMemo(() => {
    const fallback = schoolInfo?.[school] || {};
    return {
      sex: fixedMeta.gender || fallback.sex || "",
      authority: fixedMeta.authority || fallback.authority || "",
      stage: fixedMeta.stage || fallback.stage || "",
      schoolTotal:
        (Number.isFinite(fixedMeta.total) ? fixedMeta.total : 0) ||
        Number(fallback.schoolTotal) ||
        0,
    };
  }, [fixedMeta, school, schoolInfo]);

  const unvaccinated =
    (numberOrNull(refused) || 0) + (numberOrNull(absent) || 0);

  // extra client validation helps avoid backend errors
  const completeness = useMemo(() => {
    let score = 0,
      total = 6;
    if (facility) score++;
    if (center) score++;
    if (school) score++;
    if (numberOrNull(vaccinated) !== null) score++;
    if (numberOrNull(refused) !== null) score++;
    if (numberOrNull(absent) !== null) score++;
    return Math.round((score / total) * 100);
  }, [facility, center, school, vaccinated, refused, absent]);

  function askPreview(e) {
    e.preventDefault();
    const v = numberOrNull(vaccinated);
    const r = numberOrNull(refused);
    const a = numberOrNull(absent);

    if (v === null || r === null || a === null || !center || !school) {
      setStatus({ type: "error", msg: "تأكد من تعبئة الحقول بشكل صحيح" });
      return;
    }
    const total = Number(fixed.schoolTotal) || 0;
    if (total && v + r + a > total) {
      setStatus({
        type: "error",
        msg: "مجموع (مطعّم + رفض + غياب) يتجاوز إجمالي المدرسة",
      });
      return;
    }

    const data = {
      date: todayStr(),
      email,
      facility,
      center,
      school,
      vaccinated: v,
      refused: r,
      absent: a,
      unvaccinated: r + a,
      sex: fixed.sex,
      authority: fixed.authority,
      stage: fixed.stage,
      schoolTotal: Number(fixed.schoolTotal) || 0,
    };

    setStatus({ type: "idle", msg: "" });
    setPreview(data);
    log("previewData", data);
  }

  async function saveToAPI(p) {
    const input = {
      facility: p.facility,
      clinic_name: p.center,
      school_name: p.school,
      gender: p.sex || "غير محدد",
      authority: p.authority || null,
      stage: p.stage || null,
      vaccinated: Number(p.vaccinated),
      refused: Number(p.refused),
      absent: Number(p.absent),
      not_accounted: Number(p.unvaccinated),
      school_total: Number(p.schoolTotal) || 0,
      created_by: email || p.email || "",
    };

    log("submitDailyEntry payload ->", input);
    const res = await submitDailyEntry(input);

    if (res && typeof res === "object" && ("error" in res || "data" in res)) {
      if (res.error) {
        const message = res.error.message || res.error || "فشل حفظ السجل";
        throw new Error(message);
      }
      return res.data ?? res;
    }
    return res;
  }

  async function confirmSave() {
    if (!preview) return;
    try {
      setStatus({ type: "saving", msg: "جارٍ الحفظ…" });
      const saver = onSubmit || saveToAPI;
      const result = await saver(preview);
      log("save result ->", result);
      setVaccinated("");
      setRefused("");
      setAbsent("");
      setPreview(null);
      setStatus({ type: "ok", msg: "تم الحفظ بنجاح" });
    } catch (e) {
      const raw = e?.message || String(e);
      console.error("Save failed:", e);
      setStatus({ type: "error", msg: raw });
    }
  }

  const isSaving = status.type === "saving";

  return (
    <form onSubmit={askPreview} className="hpv-form space-y-5">
      {brandStyles}

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hpv-section-title">
            <span className="dot" />
            <span>بيانات المدرسة والتطعيم</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge
              tone={
                status.type === "ok"
                  ? "ok"
                  : status.type === "error"
                  ? "error"
                  : "brand"
              }
            >
              {status.type === "ok"
                ? "تم الحفظ"
                : status.type === "error"
                ? status.msg || "فشل حفظ السجل"
                : "جاهز للإدخال"}
            </Badge>
            <div
              className="w-36 h-2 rounded-full bg-gray-200 overflow-hidden"
              title={`اكتمال ${completeness}%`}
            >
              <div
                className="h-full"
                style={{
                  width: `${completeness}%`,
                  background:
                    "linear-gradient(90deg,var(--brand),var(--brand-dark))",
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* facility / center / school */}
      <Card>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="hpv-label">المنشأة الصحية</label>
            <input value={facility} disabled className="hpv-input bg-gray-100" />
            <span className="hpv-help mt-1">
              يتم تحديدها تلقائيًا حسب صلاحياتك.
            </span>
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">اسم المركز الصحي</label>
            <select
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              className="hpv-select"
            >
              {centers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="hpv-label">اسم المدرسة</label>
            <select
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className="hpv-select"
            >
              {schools.length === 0 && (
                <option value="">— لا توجد مدارس لهذا المركز —</option>
              )}
              {schools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* fixed info */}
      <Card title="الحقول الثابتة" subtitle="تُعرض للمرجع ولا يمكن تعديلها هنا.">
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col">
            <label className="hpv-label">الجنس</label>
            <input
              disabled
              className="hpv-input bg-gray-100"
              value={fixed.sex || "غير محدد"}
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">السلطة</label>
            <input
              disabled
              className="hpv-input bg-gray-100"
              value={fixed.authority || "غير محدد"}
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">المرحلة</label>
            <input
              disabled
              className="hpv-input bg-gray-100"
              value={fixed.stage || "غير محدد"}
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">إجمالي المدرسة</label>
            <input
              disabled
              className="hpv-input bg-gray-100"
              value={fixed.schoolTotal || 0}
            />
          </div>
        </div>
      </Card>

      {/* numbers */}
      <Card>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="hpv-label">عدد المطعّمين</label>
            <input
              type="number"
              min="0"
              value={vaccinated}
              onChange={(e) => setVaccinated(e.target.value)}
              className="hpv-input"
              inputMode="numeric"
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">عدد الرفض</label>
            <input
              type="number"
              min="0"
              value={refused}
              onChange={(e) => setRefused(e.target.value)}
              className="hpv-input"
              inputMode="numeric"
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">عدد الغياب</label>
            <input
              type="number"
              min="0"
              value={absent}
              onChange={(e) => setAbsent(e.target.value)}
              className="hpv-input"
              inputMode="numeric"
            />
          </div>
          <div className="flex flex-col">
            <label className="hpv-label">غير مطعّم (محسوب)</label>
            <input value={unvaccinated} disabled className="hpv-input bg-gray-100" />
          </div>
        </div>
        <div className="mt-3">
          <Badge tone="warn">تذكير: غير مطعّم = رفض + غياب</Badge>
        </div>
      </Card>

      {/* actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <button type="submit" className="hpv-btn-primary" disabled={isSaving}>
          مراجعة
        </button>
        {status.type === "ok" && (
          <span className="text-green-600 text-sm">{status.msg}</span>
        )}
        {status.type === "error" && (
          <span className="text-red-600 text-sm">{status.msg}</span>
        )}
        {isSaving && <span className="text-gray-500 text-sm">جارٍ الحفظ…</span>}
      </div>

      {/* modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="تأكيد الإرسال"
        actions={
          <>
            <button
              onClick={confirmSave}
              type="button"
              className="hpv-btn-primary"
              disabled={isSaving}
            >
              إرسال
            </button>
            <button
              onClick={() => setPreview(null)}
              type="button"
              className="hpv-btn-ghost"
              disabled={isSaving}
            >
              تعديل
            </button>
          </>
        }
      >
        {preview && (
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div>
              <b>التاريخ:</b> {preview.date}
            </div>
            <div>
              <b>المنشأة:</b> {preview.facility}
            </div>
            <div>
              <b>المركز:</b> {preview.center}
            </div>
            <div>
              <b>المدرسة:</b> {preview.school}
            </div>
            <div>
              <b>مطعّم:</b> {preview.vaccinated}
            </div>
            <div>
              <b>رفض:</b> {preview.refused}
            </div>
            <div>
              <b>غياب:</b> {preview.absent}
            </div>
            <div>
              <b>غير مطعّم:</b> {preview.unvaccinated}
            </div>
            <div>
              <b>الجنس:</b> {preview.sex || "—"}
            </div>
            <div>
              <b>السلطة:</b> {preview.authority || "—"}
            </div>
            <div>
              <b>المرحلة:</b> {preview.stage || "—"}
            </div>
            <div>
              <b>العدد الإجمالي للمدرسة:</b> {preview.schoolTotal || 0}
            </div>
          </div>
        )}
      </Modal>
    </form>
  );
}
