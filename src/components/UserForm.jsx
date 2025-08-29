
import React, { useEffect, useState } from 'react';
import { submitDailyEntry } from '../lib/storage';

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[UserForm]', ...args); };

function todayStr() { return new Date().toISOString().slice(0,10); }
function numberOrNull(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; }

function Card({ title, children }) {
  return (
    <div className="p-4 rounded-2xl shadow bg-white">
      {title && <div className="font-semibold mb-2">{title}</div>}
      {children}
    </div>
  );
}
function Modal({ open, title, children, onClose, actions }){
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-xl w-[95%] md:w-[720px] max-h-[85vh] overflow-auto p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="font-bold" style={{color:"var(--brand-dark)"}}>{title}</div>
          <button className="ml-auto btn btn-ghost" onClick={onClose}>إغلاق</button>
        </div>
        {children}
        {actions && <div className="mt-3 flex gap-2 justify-end">{actions}</div>}
      </div>
    </div>
  );
}

export default function UserForm({ email, facility, meta, onSubmit, schoolInfo }) {
  const centers = meta?.centersByFacility?.[facility] || [];
  const [center, setCenter] = useState(centers[0] || "");
  const schools = meta ? (meta.schoolsByCenter?.[facility + "::" + center] || []) : [];
  const [school, setSchool] = useState("");
  const [vaccinated, setVaccinated] = useState("");
  const [refused, setRefused] = useState("");
  const [absent, setAbsent] = useState("");
  const [status, setStatus] = useState({ type: "idle", msg: "" });
  const [preview, setPreview] = useState(null);

  useEffect(()=>{ setCenter(centers[0] || ""); log("setCenterInit", centers[0]); }, [facility, meta]);
  useEffect(()=>{ const s=(meta?.schoolsByCenter?.[facility + "::" + center] || [""])[0] || ""; setSchool(s); log("schoolsFirst", { center, first:s }); }, [center, facility, meta]);

  const fixed = schoolInfo[school] || { sex: "", authority: "", stage: "", schoolTotal: 0 };
  const unvaccinated = (numberOrNull(refused)||0) + (numberOrNull(absent)||0);

  function askPreview(e) {
    e.preventDefault();
    const v = numberOrNull(vaccinated);
    const r = numberOrNull(refused);
    const a = numberOrNull(absent);
    if (v === null || r === null || a === null || !center || !school) {
      setStatus({ type: "error", msg: "تأكد من تعبئة الحقول بشكل صحيح" });
      log("validationFail", { v, r, a, center, school });
      return;
    }
    const data = { date: todayStr(), email, facility, center, school, vaccinated: v, refused: r, absent: a, unvaccinated: r + a, sex: fixed.sex, authority: fixed.authority, stage: fixed.stage, schoolTotal: Number(fixed.schoolTotal)||0 };
    setStatus({ type: "idle", msg: "" });
    setPreview(data);
    log("previewData", data);
  }

  async function saveToAPI(p) {
    // Why: adapt front-end fields to DB columns expected by /api/submissions
    const input = {
      facility: p.facility,
      clinic_name: p.center,
      school_name: p.school,
      gender: p.sex || 'غير محدد',
      authority: p.authority,
      stage: p.stage,
      vaccinated: p.vaccinated,
      refused: p.refused,
      absent: p.absent,
      not_accounted: p.unvaccinated,
      school_total: p.schoolTotal,
      created_by: email || p.email || ''
    };
    await submitDailyEntry(input);
  }

  async function confirmSave() {
    if (!preview) return;
    try {
      setStatus({ type: 'saving', msg: 'جارٍ الحفظ…' });
      const saver = onSubmit || saveToAPI; // If parent passed a handler, use it; else save to API
      await saver(preview);
      setVaccinated(""); setRefused(""); setAbsent("");
      setPreview(null);
      setStatus({ type: "ok", msg: "تم الحفظ" });
    } catch (e) {
      console.error(e);
      setStatus({ type: "error", msg: e.message || 'حدث خطأ أثناء الحفظ' });
    }
  }

  const isSaving = status.type === 'saving';

  return (
    <form onSubmit={askPreview} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="text-sm">المنشأة الصحية</label>
          <input value={facility} disabled className="border rounded-xl px-3 py-2 bg-gray-100" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">اسم المركز الصحي</label>
          <select value={center} onChange={(e)=>{setCenter(e.target.value); log("setCenter", e.target.value);}} className="border rounded-xl px-3 py-2">
            {centers.map((c)=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col md:col-span-2">
          <label className="text-sm">اسم المدرسة</label>
          <select value={school} onChange={(e)=>{setSchool(e.target.value); log("setSchool", e.target.value);}} className="border rounded-xl px-3 py-2">
            {schools.map((s)=> <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <Card title="الحقول الثابتة (تُجلب تلقائيًا)">
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col"><label className="text-sm">الجنس</label><input disabled className="border rounded-xl px-3 py-2 bg-gray-100" value={fixed.sex || "غير محدد"} /></div>
          <div className="flex flex-col"><label className="text-sm">السلطة</label><input disabled className="border rounded-xl px-3 py-2 bg-gray-100" value={fixed.authority || "غير محدد"} /></div>
          <div className="flex flex-col"><label className="text-sm">المرحلة</label><input disabled className="border rounded-xl px-3 py-2 bg-gray-100" value={fixed.stage || "غير محدد"} /></div>
          <div className="flex flex-col"><label className="text-sm">إجمالي المدرسة</label><input disabled className="border rounded-xl px-3 py-2 bg-gray-100" value={fixed.schoolTotal || 0} /></div>
        </div>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="flex flex-col"><label className="text-sm">عدد المطعّمين</label><input type="number" min="0" value={vaccinated} onChange={(e)=>setVaccinated(e.target.value)} className="border rounded-xl px-3 py-2" /></div>
        <div className="flex flex-col"><label className="text-sm">عدد الرفض</label><input type="number" min="0" value={refused} onChange={(e)=>setRefused(e.target.value)} className="border rounded-xl px-3 py-2" /></div>
        <div className="flex flex-col"><label className="text-sm">عدد الغياب</label><input type="number" min="0" value={absent} onChange={(e)=>setAbsent(e.target.value)} className="border rounded-xl px-3 py-2" /></div>
        <div className="flex flex-col"><label className="text-sm">غير مطعّم (محسوب)</label><input value={unvaccinated} disabled className="border rounded-xl px-3 py-2 bg-gray-100" /></div>
      </div>

      <div className="flex gap-2 items-center">
        <button type="submit" className="px-6 py-2 rounded-2xl bg-black text-white hover:opacity-90" disabled={isSaving}>مراجعة</button>
        {status.type === "ok" && <span className="text-green-600">{status.msg}</span>}
        {status.type === "error" && <span className="text-red-600">{status.msg}</span>}
        {isSaving && <span className="text-gray-500">جارٍ الحفظ…</span>}
      </div>

      <Modal open={!!preview} onClose={()=>setPreview(null)} title="تأكيد الإرسال" actions={
        <>
          <button onClick={confirmSave} type="button" className="btn btn-primary" disabled={isSaving}>إرسال</button>
          <button onClick={()=>setPreview(null)} type="button" className="btn btn-ghost" disabled={isSaving}>تعديل</button>
        </>
      }>
        {preview && (
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            <div><b>التاريخ:</b> {preview.date}</div>
            <div><b>المنشأة:</b> {preview.facility}</div>
            <div><b>المركز:</b> {preview.center}</div>
            <div><b>المدرسة:</b> {preview.school}</div>
            <div><b>مطعّم:</b> {preview.vaccinated}</div>
            <div><b>رفض:</b> {preview.refused}</div>
            <div><b>غياب:</b> {preview.absent}</div>
            <div><b>غير مطعّم:</b> {preview.unvaccinated}</div>
            <div><b>الجنس:</b> {preview.sex||""}</div>
            <div><b>السلطة:</b> {preview.authority||""}</div>
            <div><b>المرحلة:</b> {preview.stage||""}</div>
            <div><b>العدد الإجمالي للمدرسة:</b> {preview.schoolTotal||0}</div>
          </div>
        )}
      </Modal>
    </form>
  );
}

