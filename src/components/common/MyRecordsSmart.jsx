import React, { useMemo, useState } from "react";

/** Local, Arabic-friendly styles */
const LocalStyles = () => (
  <style>{`
    .hpv-screen {
      --brand: #0ea5e9; --brand-dark: #075985; --accent: #22c55e;
      --ink-1:#0f172a; --ink-2:#334155; --ink-3:#64748b; --line:#e2e8f0; --bg-soft:#f8fafc;
    }
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    .hpv-screen, .hpv-screen * { font-family:"Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important; }

    .hpv-card{background:#fff;border-radius:1.2rem;box-shadow:0 12px 30px rgba(2,6,23,.06);border:1px solid var(--line)}
    .hpv-card .hd{display:flex;align-items:center;gap:.75rem;padding:1rem 1rem .25rem}
    .hpv-card .hd .title{font-weight:800;color:var(--ink-1);letter-spacing:.2px}
    .hpv-card .body{padding:.75rem 1rem 1rem}

    .hpv-input,.hpv-select{border-radius:1rem;padding:.7rem .95rem;border:1px solid var(--line);background:#fff;color:var(--ink-2);transition:border-color .15s,box-shadow .15s,background .15s,transform .08s}
    .hpv-input:focus,.hpv-select:focus{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(14,165,233,.18);transform:translateY(-1px)}
    .hpv-label{font-size:.85rem;color:var(--ink-2);margin-bottom:.35rem}

    .hpv-btn{border-radius:999px;padding:.6rem 1.1rem;font-weight:700;letter-spacing:.2px;transition:background .15s,box-shadow .15s,transform .15s,filter .15s;display:inline-flex;align-items:center;gap:.5rem}
    .hpv-btn-primary{color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand-dark));box-shadow:0 10px 22px rgba(14,165,233,.28)}
    .hpv-btn-primary:hover{background:linear-gradient(135deg,var(--brand-dark),var(--brand));transform:translateY(-1px);box-shadow:0 12px 26px rgba(7,89,133,.32);filter:saturate(1.06)}
    .hpv-btn-ghost{background:#fff;border:1px solid var(--line);color:var(--ink-2)}
    .hpv-btn-ghost:hover{background:var(--bg-soft)}

    .hpv-chip{display:inline-flex;align-items:center;gap:.45rem;font-size:.78rem;font-weight:700;padding:.35rem .7rem;border-radius:999px;border:1px solid var(--line);background:var(--bg-soft);color:var(--ink-2)}
    .hpv-chip.ok{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
    .hpv-chip.muted{color:var(--ink-3)}

    .hpv-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:1rem;background:#fff}
    table.hpv-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.95rem}
    table.hpv-table thead th{position:sticky;top:0;z-index:1;background:linear-gradient(0deg,#fff,#fff 70%,#f8fafc);padding:.75rem .75rem;text-align:right;color:var(--ink-3);font-weight:800;letter-spacing:.2px}
    table.hpv-table tbody td{padding:.75rem .75rem;border-top:1px solid #f1f5f9;color:#0f172a}
    table.hpv-table tbody tr:nth-child(odd){background:#fcfcfd}
    table.hpv-table tbody tr:hover{background:#f5f7fb}
    table.hpv-table thead th:first-child{border-top-right-radius:1rem}
    table.hpv-table thead th:last-child{border-top-left-radius:1rem}

    .hpv-topline{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;margin:.4rem .25rem .9rem}
    .hpv-topline .count{font-size:.85rem;color:var(--ink-3)}

    /* Modal */
    .hpv-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:50}
    .hpv-modal{background:#fff;border-radius:1rem;box-shadow:0 20px 50px rgba(2,6,23,.25);width:95%;max-width:700px;overflow:hidden}
    .hpv-modal .bar{height:6px;background:linear-gradient(90deg,var(--brand),var(--brand-dark))}
    .hpv-modal .content{padding:1rem}
    .hpv-modal .actions{display:flex;gap:.6rem;justify-content:flex-end;margin-top:1rem}
    .hpv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}
    @media (max-width:640px){ .hpv-grid{grid-template-columns:1fr} }
  `}</style>
);

/** Small field wrapper */
function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="hpv-label">{label}</label>
      {children}
    </div>
  );
}

/* Helpers */
const toInt = (v) =>
  Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0;

// strict "YYYY-MM-DD HH:MM" (Gregorian) or "—"
const fmtYMD_HM = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

export default function MyRecordsSmart({ email, rows, onExport, onRowEdited }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    q: "",
    sortBy: "date",
    dir: "desc",
  });

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null); // the original row object
  const [ev, setEv] = useState({ vaccinated: "", refused: "", absent: "" }); // editable values
  const unvaccinatedLive = toInt(ev.refused) + toInt(ev.absent);

  /** 1) Filter (case-insensitive search) */
  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter((r) => {
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

  /** 2) De-dupe by (date|center|school); latest wins if ts exists */
  const uniqueByPair = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = `${r.date}|${r.center}|${r.school}`;
      const prev = map.get(key);
      if (!prev || (r.ts ?? 0) >= (prev?.ts ?? 0)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [filtered]);

  /** 3) Sort */
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

  /** 4) Totals */
  const totals = useMemo(
    () =>
      sorted.reduce(
        (acc, r) => {
          acc.v += Number(r.vaccinated) || 0;
          acc.r += Number(r.refused) || 0;
          acc.a += Number(r.absent) || 0;
          acc.u += Number(r.unvaccinated) || 0;
          return acc;
        },
        { v: 0, r: 0, a: 0, u: 0 }
      ),
    [sorted]
  );

  function clearFilters() {
    setFilters({ from: "", to: "", q: "", sortBy: "date", dir: "desc" });
  }

  /** Open editor for a row */
  function openEdit(r) {
    setEditRow(r);
    setEv({
      vaccinated: r.vaccinated ?? "",
      refused: r.refused ?? "",
      absent: r.absent ?? "",
    });
    setEditOpen(true);
  }

  /** Save edit (upsert via the same API) */
  async function saveEdit() {
    if (!editRow) return;
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

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save entry");
      }
      const updated = await res.json(); // should include updated_at/created_at
      setEditOpen(false);

      if (typeof onRowEdited === "function") {
        onRowEdited({
          ...editRow,
          vaccinated: payload.vaccinated,
          refused: payload.refused,
          absent: payload.absent,
          unvaccinated: payload.not_accounted,
          updated_at:
            updated?.updated_at ||
            updated?.created_at ||
            new Date().toISOString(),
        });
      } else {
        window.location.reload();
      }
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
          {/* Topline */}
          <div className="hpv-topline">
            <span className="hpv-chip ok">مطعّم: {totals.v}</span>
            <span className="hpv-chip">رفض: {totals.r}</span>
            <span className="hpv-chip">غياب: {totals.a}</span>
            <span className="hpv-chip muted">غير مطعّم: {totals.u}</span>
            <span className="ml-auto"></span>
            {onExport && (
              <button
                type="button"
                className="hpv-btn hpv-btn-ghost"
                onClick={() => onExport(sorted)}
                title="تصدير"
              >
                تصدير
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-5 items-end mb-3 hpv-grid">
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

          <div className="flex gap-2 mb-4">
            <button type="button" className="hpv-btn hpv-btn-primary">
              تطبيق
            </button>
            <button
              type="button"
              className="hpv-btn hpv-btn-ghost"
              onClick={clearFilters}
            >
              مسح الفلاتر
            </button>
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
                    {/* show created_at (or date-only if missing) in strict Y-M-D HM */}
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
                    {fmtYMD_HM(editRow.created_at) || `${editRow.date} 00:00`} —{" "}
                    <b>المركز:</b> {editRow.center} — <b>المدرسة:</b>{" "}
                    {editRow.school}
                  </div>
                  <div className="hpv-grid">
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
                  <div className="actions">
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
