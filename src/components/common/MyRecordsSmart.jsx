import React, { useMemo, useState } from "react";

/** Styles */
const LocalStyles = () => (
  <style>{`
    .hpv-screen { --brand:#0ea5e9; --brand-dark:#075985 }
    .hpv-screen, .hpv-screen * { font-family:"Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important; }
    .hpv-card{background:#fff;border-radius:1.2rem;box-shadow:0 12px 30px rgba(2,6,23,.06);border:1px solid #e2e8f0}
    .hpv-card .hd{display:flex;align-items:center;gap:.75rem;padding:1rem 1rem .25rem}
    .hpv-card .hd .title{font-weight:800;color:#0f172a}
    .hpv-card .body{padding:.75rem 1rem 1rem}
    .hpv-input,.hpv-select{border-radius:1rem;padding:.7rem .95rem;border:1px solid #e2e8f0;background:#fff}
    .hpv-label{font-size:.85rem;color:#334155;margin-bottom:.35rem}
    .hpv-btn{border-radius:999px;padding:.6rem 1.1rem;font-weight:700}
    .hpv-btn-primary{color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand-dark))}
    .hpv-btn-ghost{background:#fff;border:1px solid #e2e8f0}
    .hpv-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:1rem;background:#fff}
    table.hpv-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.95rem}
    table.hpv-table thead th{position:sticky;top:0;background:#fff;padding:.75rem .75rem;text-align:right;color:#64748b;font-weight:800}
    table.hpv-table tbody td{padding:.75rem .75rem;border-top:1px solid #f1f5f9;color:#0f172a}
  `}</style>
);

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="hpv-label">{label}</label>
      {children}
    </div>
  );
}

const toInt = (v) =>
  Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;

/* YYYY-MM-DD HH:MM (Gregorian) or "—" */
const fmtYMD_HM = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/* robust JSON parser for APIs that may return empty body / 204 */
async function safeJSON(res) {
  try {
    if (res.status === 204) return {};
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("application/json")) {
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    }
    return await res.json();
  } catch {
    return {};
  }
}

export default function MyRecordsSmart({
  email = "",
  rows = [],
  onExport,
  onRowEdited,
}) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    q: "",
    sortBy: "date",
    dir: "desc",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [ev, setEv] = useState({ vaccinated: "", refused: "", absent: "" });
  const unvaccinatedLive = toInt(ev.refused) + toInt(ev.absent);

  const filtered = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    const q = (filters.q || "").trim().toLowerCase();
    return list.filter((r) => {
      if (r.email !== email) return false;
      if (filters.from && r.date < filters.from) return false;
      if (filters.to && r.date > filters.to) return false;
      if (
        q &&
        !(
          `${r.center}`.toLowerCase().includes(q) ||
          `${r.school}`.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [rows, email, filters.from, filters.to, filters.q]);

  const uniqueByPair = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = `${r.date}|${r.center}|${r.school}`;
      const prev = map.get(key);
      if (!prev || (r.ts ?? 0) >= (prev?.ts ?? 0)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [filtered]);

  const sorted = useMemo(() => {
    const arr = [...uniqueByPair];
    const dir = filters.dir === "asc" ? 1 : -1;
    if (filters.sortBy === "vaccinated")
      arr.sort((a, b) => (a.vaccinated - b.vaccinated) * dir);
    else if (filters.sortBy === "unvaccinated")
      arr.sort((a, b) => (a.unvaccinated - b.unvaccinated) * dir);
    else arr.sort((a, b) => a.date.localeCompare(b.date) * dir);
    return arr;
  }, [uniqueByPair, filters.sortBy, filters.dir]);

  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => ({
          v: acc.v + (+r.vaccinated || 0),
          r: acc.r + (+r.refused || 0),
          a: acc.a + (+r.absent || 0),
          u: acc.u + (+r.unvaccinated || 0),
        }),
        { v: 0, r: 0, a: 0, u: 0 }
      ),
    [sorted]
  );

  function clearFilters() {
    setFilters({ from: "", to: "", q: "", sortBy: "date", dir: "desc" });
  }
  function openEdit(r) {
    setEditRow(r);
    setEv({
      vaccinated: r.vaccinated ?? "",
      refused: r.refused ?? "",
      absent: r.absent ?? "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    try {
      const payload = {
        facility: editRow.facility,
        clinic_name: editRow.center,
        school_name: editRow.school,
        gender: editRow.sex || null,
        authority: editRow.authority || null,
        stage: editRow.stage || null,
        vaccinated: toInt(ev.vaccinated),
        refused: toInt(ev.refused),
        absent: toInt(ev.absent),
        not_accounted: unvaccinatedLive,
        school_total: Number(editRow.schoolTotal) || 0,
        created_by: email || editRow.email || null,
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJSON(res);
      if (!res.ok)
        throw new Error(
          data?.error || `Failed to save entry (HTTP ${res.status})`
        );

      setEditOpen(false);
      onRowEdited?.({
        ...editRow,
        vaccinated: payload.vaccinated,
        refused: payload.refused,
        absent: payload.absent,
        unvaccinated: payload.not_accounted,
        updated_at:
          data?.updated_at || data?.created_at || new Date().toISOString(),
      });
    } catch (e) {
      alert(e.message || "تعذّر حفظ التعديل");
    }
  }

  return (
    <section className="hpv-screen">
      <LocalStyles />

      <div className="hpv-card">
        <div className="hd">
          <div className="title">سجلاتي</div>
          <div className="ml-auto count">{sorted.length} سجلّ</div>
        </div>

        <div className="body">
          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-5 items-end mb-3">
            <Field label="من">
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, from: e.target.value }))
                }
                className="hpv-input"
              />
            </Field>
            <Field label="إلى">
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, to: e.target.value }))
                }
                className="hpv-input"
              />
            </Field>
            <Field label="بحث">
              <input
                placeholder="ابحث في المركز/المدرسة"
                value={filters.q}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, q: e.target.value }))
                }
                className="hpv-input"
              />
            </Field>
            <Field label="ترتيب حسب">
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, sortBy: e.target.value }))
                }
                className="hpv-select"
              >
                <option value="date">التاريخ</option>
                <option value="vaccinated">مطعّم</option>
                <option value="unvaccinated">غير مطعّم</option>
              </select>
            </Field>
            <Field label="الاتجاه">
              <select
                value={filters.dir}
                onChange={(e) =>
                  setFilters((x) => ({ ...x, dir: e.target.value }))
                }
                className="hpv-select"
              >
                <option value="desc">الأكثر</option>
                <option value="asc">الأقل</option>
              </select>
            </Field>
          </div>

          {/* Table */}
          <div className="hpv-table-wrap">
            <table className="hpv-table text-sm">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المركز</th>
                  <th>المدرسة</th>
                  <th>مطعّم</th>
                  <th>رفض</th>
                  <th>غياب</th>
                  <th>غير مطعّم</th>
                  <th>آخر تعديل</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(-500).map((r) => (
                  <tr key={`${r.date}|${r.center}|${r.school}`}>
                    <td className="whitespace-nowrap">
                      {r.created_at
                        ? fmtYMD_HM(r.created_at)
                        : `${r.date} 00:00`}
                    </td>
                    <td>{r.center}</td>
                    <td>{r.school}</td>
                    <td>{r.vaccinated}</td>
                    <td>{r.refused}</td>
                    <td>{r.absent}</td>
                    <td>{r.unvaccinated}</td>
                    <td className="whitespace-nowrap">
                      {fmtYMD_HM(r.updated_at)}
                    </td>
                    <td>
                      <button
                        className="hpv-btn hpv-btn-ghost"
                        onClick={() => openEdit(r)}
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-500 py-8">
                      لا توجد سجلات مطابقة للفلاتر الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="hpv-modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="hpv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bar" />
            <div className="content">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="font-extrabold text-lg"
                  style={{ color: "var(--brand-dark)" }}
                >
                  تعديل الأرقام
                </div>
                <button
                  className="ml-auto hpv-btn hpv-btn-ghost"
                  onClick={() => setEditOpen(false)}
                >
                  إغلاق
                </button>
              </div>

              {editRow && (
                <>
                  <div className="text-sm mb-3 text-gray-600">
                    <b>التاريخ:</b>{" "}
                    {editRow.created_at
                      ? fmtYMD_HM(editRow.created_at)
                      : `${editRow.date} 00:00`}{" "}
                    — <b>المركز:</b> {editRow.center} — <b>المدرسة:</b>{" "}
                    {editRow.school}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="عدد المطعّمين">
                      <input
                        type="number"
                        min="0"
                        className="hpv-input"
                        value={ev.vaccinated}
                        onChange={(e) =>
                          setEv((x) => ({ ...x, vaccinated: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="عدد الرفض">
                      <input
                        type="number"
                        min="0"
                        className="hpv-input"
                        value={ev.refused}
                        onChange={(e) =>
                          setEv((x) => ({ ...x, refused: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="عدد الغياب">
                      <input
                        type="number"
                        min="0"
                        className="hpv-input"
                        value={ev.absent}
                        onChange={(e) =>
                          setEv((x) => ({ ...x, absent: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="غير مطعّم (محسوب)">
                      <input
                        className="hpv-input"
                        value={unvaccinatedLive}
                        disabled
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      className="hpv-btn hpv-btn-primary"
                      onClick={saveEdit}
                    >
                      حفظ
                    </button>
                    <button
                      className="hpv-btn hpv-btn-ghost"
                      onClick={() => setEditOpen(false)}
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
