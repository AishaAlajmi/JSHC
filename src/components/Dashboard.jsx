// File: src/components/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { META, FACILITIES } from "../data/meta";

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log("[Dashboard]", ...args); };

/** Light, cool palette */
const PALETTE = {
  cardBg: "#F7FAFF",
  cardBorder: "#E7EEF7",
  chipIndigo: "bg-indigo-50 text-indigo-600",
  chipSky: "bg-sky-50 text-sky-600",
  chipRose: "bg-rose-50 text-rose-600",
  chipEmerald: "bg-emerald-50 text-emerald-600",
  chipSlate: "bg-slate-50 text-slate-600",
};

// ---------- tiny primitives ----------
const Wrap = ({ children }) => (
  <div className="space-y-4">
    {/* Header (kept, but softened with ring & rounded) */}
    <div className="rounded-2xl p-4 md:p-5 bg-[#0f172a] text-white shadow ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" className="opacity-90">
          <path fill="currentColor" d="M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z"/>
        </svg>
        <div>
          <div className="text-xl font-semibold tracking-tight">لوحة متابعة الحملة</div>
          <div className="text-white/70 text-sm">مؤشرات مباشرة تساعد الإدارة في اتخاذ القرار والمتابعة</div>
        </div>
      </div>
    </div>
    {children}
  </div>
);

function Card({ title, children, actions }) {
  return (
    <section
      className="p-4 rounded-2xl"
      style={{
        background: PALETTE.cardBg,
        border: `1px solid ${PALETTE.cardBorder}`,
        boxShadow: "0 1px 2px rgba(2,6,23,0.04)",
      }}
    >
      {(title || actions) && (
        <header className="flex items-center gap-2 mb-3">
          {title && <h3 className="font-semibold text-slate-800 tracking-tight">{title}</h3>}
          <div className="ml-auto flex gap-2">{actions}</div>
        </header>
      )}
      {children}
    </section>
  );
}

function KPI({ label, value, hint, icon, tone = "indigo" }) {
  const chip =
    {
      indigo: PALETTE.chipIndigo,
      sky: PALETTE.chipSky,
      rose: PALETTE.chipRose,
      emerald: PALETTE.chipEmerald,
      slate: PALETTE.chipSlate,
    }[tone] || PALETTE.chipSlate;

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        background: PALETTE.cardBg,
        border: `1px solid ${PALETTE.cardBorder}`,
        boxShadow: "0 1px 2px rgba(2,6,23,0.04)",
      }}
    >
      <div className="flex items-center gap-2 text-slate-600">
        <div className={`w-9 h-9 ${chip} rounded-xl grid place-items-center`}>{icon}</div>
        <div className="text-sm">{label}</div>
      </div>
      <div className="text-3xl font-bold mt-1 text-slate-900 tracking-tight">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}

const Pill = ({ children, tone = "indigo" }) => {
  const styles = {
    indigo: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    slate: "bg-slate-50 text-slate-700 border border-slate-200",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
};

// ---------- helpers ----------
const num = (v) => Number(v) || 0;
const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString("ar-EG");
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));
const dateKey = (d) => (d || "").slice(0, 10);

// ---------- main ----------
export default function Dashboard({ responses, onExport, schoolInfo, onUpdateSchoolInfo }) {
  // filters
  const [filters, setFilters] = useState({ from: "", to: "", facility: "", center: "", school: "" });

  // options inferred from data
  const allFacilities = useMemo(
    () => unique([...(FACILITIES || []), ...responses.map((r) => r.facility)]),
    [responses]
  );
  const centersForFacility = useMemo(() => {
    const src = filters.facility ? responses.filter((r) => r.facility === filters.facility) : responses;
    return unique(src.map((r) => r.center));
  }, [responses, filters.facility]);

  const schoolsForCenter = useMemo(() => {
    if (!filters.center) return [];
    const fromMeta = META?.schoolsByCenter?.[filters.center] || [];
    const fromData = responses.filter((r) => r.center === filters.center).map((r) => r.school);
    return unique([...fromMeta, ...fromData]);
  }, [responses, filters.center]);

  // apply filters
  const filtered = useMemo(() => {
    const out = responses.filter((r) => {
      const inDate = (!filters.from || r.date >= filters.from) && (!filters.to || r.date <= filters.to);
      const inFac = !filters.facility || r.facility === filters.facility;
      const inCtr = !filters.center || r.center === filters.center;
      const inSchool = !filters.school || r.school === filters.school;
      return inDate && inFac && inCtr && inSchool;
    });
    log("filtered", { count: out.length, filters });
    return out;
  }, [responses, filters]);

  // aggregates
  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          vaccinated: acc.vaccinated + num(r.vaccinated),
          refused: acc.refused + num(r.refused),
          absent: acc.absent + num(r.absent),
          unvaccinated: acc.unvaccinated + num(r.unvaccinated),
          schoolTotal: acc.schoolTotal + num(r.schoolTotal),
        }),
        { vaccinated: 0, refused: 0, absent: 0, unvaccinated: 0, schoolTotal: 0 }
      ),
    [filtered]
  );

  const denominator = totals.vaccinated + totals.unvaccinated + totals.absent + totals.refused;
  const coverage = pct(totals.vaccinated, denominator);
  const refusalRate = pct(totals.refused, denominator);
  const absenceRate = pct(totals.absent, denominator);

  const facilitiesCount = unique(filtered.map((r) => r.facility)).length;
  const centersCount = unique(filtered.map((r) => r.center)).length;
  const schoolsCount = unique(filtered.map((r) => r.school)).length;

  // trend by date
  const byDate = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const k = dateKey(r.date);
      if (!m.has(k)) m.set(k, { date: k, vaccinated: 0, unvaccinated: 0, refused: 0, absent: 0 });
      const x = m.get(k);
      x.vaccinated += num(r.vaccinated);
      x.unvaccinated += num(r.unvaccinated);
      x.refused += num(r.refused);
      x.absent += num(r.absent);
    });
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // by center
  const byCenter = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const key = (r.facility || "") + "::" + (r.center || "");
      if (!m.has(key))
        m.set(key, { facility: r.facility, center: r.center, vaccinated: 0, unvaccinated: 0, refused: 0 });
      const x = m.get(key);
      x.vaccinated += num(r.vaccinated);
      x.unvaccinated += num(r.unvaccinated);
      x.refused += num(r.refused);
    });
    return Array.from(m.values());
  }, [filtered]);

  const barData = byCenter.map((c) => ({
    name: `${c.center || "-"}\n${c.facility || "-"}`,
    vaccinated: c.vaccinated,
    unvaccinated: c.unvaccinated,
    refused: c.refused,
  }));

  const topRisk = [...byCenter]
    .map((c) => ({ ...c, risk: c.unvaccinated + c.refused }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 5);

  // data quality
  const dqMissing = filtered
    .filter((r) => r.school && (!r.sex || !r.authority || !r.stage || !r.schoolTotal))
    .slice(0, 8);

  // ---- School info editor ----
  const allSchools = useMemo(() => Object.values(META.schoolsByCenter || {}).flat(), []);
  const [editSchool, setEditSchool] = useState("");
  const [info, setInfo] = useState({ sex: "", authority: "", stage: "", schoolTotal: "" });
  useEffect(() => {
    const cur = schoolInfo[editSchool] || { sex: "", authority: "", stage: "", schoolTotal: "" };
    setInfo(cur);
  }, [editSchool, schoolInfo]);

  function saveInfo() {
    if (!editSchool) return;
    const map = { ...schoolInfo, [editSchool]: { ...info, schoolTotal: Number(info.schoolTotal) || 0 } };
    onUpdateSchoolInfo(map);
  }

  // ---------- UI ----------
  return (
    <Wrap>
      {/* Filters */}
      <Card title="الترشيح">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            {
              label: "من تاريخ",
              type: "date",
              value: filters.from,
              onChange: (v) => setFilters((x) => ({ ...x, from: v })),
            },
            {
              label: "إلى تاريخ",
              type: "date",
              value: filters.to,
              onChange: (v) => setFilters((x) => ({ ...x, to: v })),
            },
          ].map((f, i) => (
            <div key={i} className="flex flex-col">
              <label className="text-sm text-slate-600 mb-1">{f.label}</label>
              <input
                type={f.type}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          ))}

          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">المنشأة الصحية</label>
            <select
              value={filters.facility}
              onChange={(e) => setFilters((x) => ({ ...x, facility: e.target.value, center: "", school: "" }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">الكل</option>
              {allFacilities.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">المركز</label>
            <select
              value={filters.center}
              onChange={(e) => setFilters((x) => ({ ...x, center: e.target.value, school: "" }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">الكل</option>
              {centersForFacility.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">المدرسة</label>
            <select
              value={filters.school}
              onChange={(e) => setFilters((x) => ({ ...x, school: e.target.value }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">الكل</option>
              {schoolsForCenter.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ from: "", to: "", facility: "", center: "", school: "" })}
              className="px-4 py-2 rounded-xl border border-[#E7EEF7] bg-white hover:bg-slate-50 w-full"
            >
              مسح التصفية
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <KPI
          label="إجمالي السجلات"
          value={fmt(filtered.length)}
          hint={`${facilitiesCount} منشأة • ${centersCount} مراكز • ${schoolsCount} مدارس`}
          tone="indigo"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z"/></svg>}
        />
        <KPI
          label="مطعّم"
          value={fmt(totals.vaccinated)}
          tone="emerald"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="m9 16.2-3.5-3.5L4 14.2L9 19l12-12-1.5-1.5z"/></svg>}
        />
        <KPI
          label="غير مطعّم"
          value={fmt(totals.unvaccinated)}
          tone="rose"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="m19 6.41-1.41-1.41L12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>}
        />
        <KPI
          label="نسبة التغطية"
          value={`${coverage}%`}
          hint="(مطعّم ÷ إجمالي المستهدف)"
          tone="indigo"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>}
        />
        <KPI
          label="نسبة الرفض"
          value={`${refusalRate}%`}
          tone="rose"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2 1 21h22L12 2Zm0 3.84L19.53 19H4.47L12 5.84ZM11 9v5h2V9h-2Zm0 6v2h2v-2h-2Z"/></svg>}
        />
        <KPI
          label="غياب"
          value={fmt(totals.absent)}
          tone="slate"
          icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a9 9 0 1 0 .002 18.002A9 9 0 0 0 12 2zm1 5h-2v6h6v-2h-4z"/></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="اتجاه التنفيذ الزمني">
          <div className="h-64">
            {byDate.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500">لا توجد بيانات لعرض الاتجاه.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDate} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="vaccinated" stroke="#10b981" strokeWidth={2} name="مطعّم" />
                  <Line type="monotone" dataKey="unvaccinated" stroke="#ef4444" strokeWidth={2} name="غير مطعّم" />
                  <Line type="monotone" dataKey="refused" stroke="#f59e0b" strokeWidth={2} name="رفض" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="حسب المركز">
          <div className="h-64">
            {barData.length === 0 ? (
              <div className="h-full grid place-items-center text-slate-500">لا توجد بيانات لعرضها.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="vaccinated" fill="#10b981" name="مطعّم" />
                  <Bar dataKey="unvaccinated" fill="#ef4444" name="غير مطعّم" />
                  <Bar dataKey="refused" fill="#f59e0b" name="رفض" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="توزيع الفئات">
          <div className="h-64">
            {totals.vaccinated + totals.unvaccinated + totals.refused + totals.absent === 0 ? (
              <div className="h-full grid place-items-center text-slate-500">لا توجد بيانات للتوزيع.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "مطعّم", value: totals.vaccinated, color: "#10b981" },
                      { name: "غير مطعّم", value: totals.unvaccinated, color: "#ef4444" },
                      { name: "رفض", value: totals.refused, color: "#f59e0b" },
                      { name: "غياب", value: totals.absent, color: "#64748b" },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    dataKey="value"
                    nameKey="name"
                  >
                    {["#10b981", "#ef4444", "#f59e0b", "#64748b"].map((c, i) => (
                      <Cell key={i} fill={c} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Pill tone="emerald">تغطية {coverage}%</Pill>
            <Pill tone="amber">رفض {refusalRate}%</Pill>
            <Pill tone="slate">غياب {fmt(totals.absent)}</Pill>
          </div>
        </Card>
      </div>

      {/* Top risk & Data Quality */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="أعلى المراكز خطورة (غير مطعّم + رفض)">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ background: PALETTE.cardBg }}>
                <tr className="text-right border-b border-[#E7EEF7] text-slate-600">
                  <th className="p-2">المنشأة</th>
                  <th className="p-2">المركز</th>
                  <th className="p-2">غير مطعّم</th>
                  <th className="p-2">رفض</th>
                  <th className="p-2">المجموع الخطِر</th>
                </tr>
              </thead>
              <tbody>
                {topRisk.length === 0 && (
                  <tr>
                    <td className="p-3 text-slate-500" colSpan={5}>
                      لا توجد بيانات.
                    </td>
                  </tr>
                )}
                {topRisk.map((r, i) => (
                  <tr key={i} className="border-b border-[#E7EEF7] odd:bg-white even:bg-[#F7FAFF]/60 hover:bg-slate-50">
                    <td className="p-2">{r.facility || "-"}</td>
                    <td className="p-2">{r.center || "-"}</td>
                    <td className="p-2">{fmt(r.unvaccinated)}</td>
                    <td className="p-2">{fmt(r.refused)}</td>
                    <td className="p-2 font-semibold">{fmt(r.risk)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="جودة البيانات — حقول ناقصة">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ background: PALETTE.cardBg }}>
                <tr className="text-right border-b border-[#E7EEF7] text-slate-600">
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">المركز</th>
                  <th className="p-2">المدرسة</th>
                  <th className="p-2">الحقول الناقصة</th>
                </tr>
              </thead>
              <tbody>
                {dqMissing.length === 0 && (
                  <tr>
                    <td className="p-3 text-slate-500" colSpan={4}>
                      البيانات مكتملة 👍
                    </td>
                  </tr>
                )}
                {dqMissing.map((r, i) => {
                  const missing = [];
                  if (!r.sex) missing.push("الجنس");
                  if (!r.authority) missing.push("السلطة");
                  if (!r.stage) missing.push("المرحلة");
                  if (!r.schoolTotal) missing.push("إجمالي المدرسة");
                  return (
                    <tr key={i} className="border-b border-[#E7EEF7] odd:bg-white even:bg-[#F7FAFF]/60 hover:bg-slate-50">
                      <td className="p-2">{r.date}</td>
                      <td className="p-2">{r.center || "-"}</td>
                      <td className="p-2">{r.school || "-"}</td>
                      <td className="p-2">{missing.join("، ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Latest records */}
      <Card
        title="أحدث السجلات"
        actions={
          <button
            onClick={() => onExport(filtered)}
            className="px-4 py-2 rounded-xl border border-[#E7EEF7] bg-white hover:bg-slate-50"
          >
            حفظ كـ Excel
          </button>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead
              className="sticky top-0 z-10"
              style={{ background: PALETTE.cardBg }}
            >
              <tr className="text-right border-b border-[#E7EEF7] text-slate-600">
                <th className="p-2">التاريخ</th>
                <th className="p-2">المنشأة</th>
                <th className="p-2">المركز</th>
                <th className="p-2">المدرسة</th>
                <th className="p-2">الجنس</th>
                <th className="p-2">السلطة</th>
                <th className="p-2">المرحلة</th>
                <th className="p-2">إجمالي المدرسة</th>
                <th className="p-2">مطعّم</th>
                <th className="p-2">رفض</th>
                <th className="p-2">غياب</th>
                <th className="p-2">غير مطعّم</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-slate-500" colSpan={12}>
                    لا توجد بيانات ضمن التصفية الحالية.
                  </td>
                </tr>
              )}
              {filtered
                .slice(-400)
                .reverse()
                .map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-[#E7EEF7] odd:bg-white even:bg-[#F7FAFF]/60 hover:bg-slate-50"
                  >
                    <td className="p-2 whitespace-nowrap">{r.date}</td>
                    <td className="p-2">{r.facility}</td>
                    <td className="p-2">{r.center}</td>
                    <td className="p-2">{r.school}</td>
                    <td className="p-2">{r.sex || ""}</td>
                    <td className="p-2">{r.authority || ""}</td>
                    <td className="p-2">{r.stage || ""}</td>
                    <td className="p-2">{num(r.schoolTotal)}</td>
                    <td className="p-2">{num(r.vaccinated)}</td>
                    <td className="p-2">{num(r.refused)}</td>
                    <td className="p-2">{num(r.absent)}</td>
                    <td className="p-2">{num(r.unvaccinated)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* School attributes manager */}
      <Card
        title="إدارة خصائص المدارس"
        actions={
          <button
            onClick={saveInfo}
            className="px-3 py-1 rounded-xl border border-[#E7EEF7] bg-white hover:bg-slate-50"
          >
            حفظ
          </button>
        }
      >
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">اختر مدرسة</label>
            <select
              value={editSchool}
              onChange={(e) => setEditSchool(e.target.value)}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">— اختر —</option>
              {allSchools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">الجنس</label>
            <select
              value={info.sex}
              onChange={(e) => setInfo((x) => ({ ...x, sex: e.target.value }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">—</option>
              <option value="بنات">بنات</option>
              <option value="بنين">بنين</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">السلطة</label>
            <select
              value={info.authority}
              onChange={(e) => setInfo((x) => ({ ...x, authority: e.target.value }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">—</option>
              <option value="حكومي">حكومي</option>
              <option value="أهلي">أهلي</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">المرحلة</label>
            <select
              value={info.stage}
              onChange={(e) => setInfo((x) => ({ ...x, stage: e.target.value }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">—</option>
              <option value="رياض أطفال">رياض أطفال</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="متوسط">متوسط</option>
              <option value="ثانوي">ثانوي</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-slate-600 mb-1">العدد الإجمالي للمدرسة</label>
            <input
              type="number"
              min="0"
              value={info.schoolTotal}
              onChange={(e) => setInfo((x) => ({ ...x, schoolTotal: e.target.value }))}
              className="rounded-xl px-3 py-2 bg-white border border-[#E7EEF7] focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
      </Card>
    </Wrap>
  );
}
