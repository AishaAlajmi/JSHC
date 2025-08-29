import React, { useMemo, useState } from "react";

/** ─────────────────────────  Local, Arabic-friendly styles  ───────────────────────── */
const LocalStyles = () => (
  <style>{`
    /* Theme (scoped) */
    .hpv-screen {
      --brand: #0ea5e9;        /* Sky 500  ➜ main button color */
      --brand-dark: #075985;   /* Darker hover */
      --accent: #22c55e;       /* Green for positive badges */
      --ink-1: #0f172a;        /* Slate 900 */
      --ink-2: #334155;        /* Slate 700 */
      --ink-3: #64748b;        /* Slate 500 */
      --line: #e2e8f0;         /* Slate 200 */
      --bg-soft: #f8fafc;      /* Slate 50 */
    }

    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    .hpv-screen, .hpv-screen * {
      font-family: "Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important;
    }

    /* Card */
    .hpv-card { background:#fff; border-radius:1.2rem; box-shadow:0 12px 30px rgba(2,6,23,.06); border:1px solid var(--line); }
    .hpv-card .hd { display:flex; align-items:center; gap:.75rem; padding:1rem 1rem .25rem; }
    .hpv-card .hd .title { font-weight:800; color:var(--ink-1); letter-spacing:.2px; }
    .hpv-card .body { padding: .75rem 1rem 1rem; }

    /* Inputs */
    .hpv-input, .hpv-select {
      border-radius: 1rem; padding: .7rem .95rem; border:1px solid var(--line); background:#fff; color:var(--ink-2);
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease, transform .08s ease;
    }
    .hpv-input:focus, .hpv-select:focus {
      outline:none; border-color: var(--brand);
      box-shadow: 0 0 0 3px rgba(14,165,233,.18);
      transform: translateY(-1px);
    }
    .hpv-label { font-size:.85rem; color:var(--ink-2); margin-bottom:.35rem; }

    /* Buttons */
    .hpv-btn {
      border-radius: 999px; padding: .6rem 1.1rem; font-weight:700; letter-spacing:.2px;
      transition: background .15s ease, box-shadow .15s ease, transform .15s ease, filter .15s;
      display:inline-flex; align-items:center; gap:.5rem;
    }
    .hpv-btn-primary {
      color:#fff; background:linear-gradient(135deg,var(--brand),var(--brand-dark));
      box-shadow:0 10px 22px rgba(14,165,233,.28);
    }
    .hpv-btn-primary:hover {
      background:linear-gradient(135deg,var(--brand-dark),var(--brand));
      transform:translateY(-1px);
      box-shadow:0 12px 26px rgba(7,89,133,.32);
      filter:saturate(1.06);
    }
    .hpv-btn-ghost {
      background:#fff; border:1px solid var(--line); color:var(--ink-2);
    }
    .hpv-btn-ghost:hover { background:var(--bg-soft); }

    /* Small badges */
    .hpv-chip {
      display:inline-flex; align-items:center; gap:.45rem; font-size:.78rem; font-weight:700;
      padding:.35rem .7rem; border-radius:999px; border:1px solid var(--line); background:var(--bg-soft); color:var(--ink-2);
    }
    .hpv-chip.ok { border-color:#bbf7d0; background:#f0fdf4; color:#166534; }        /* green */
    .hpv-chip.muted { color:var(--ink-3); }

    /* Table */
    .hpv-table-wrap { overflow:auto; border:1px solid var(--line); border-radius:1rem; background:#fff; }
    table.hpv-table { width:100%; border-collapse:separate; border-spacing:0; font-size:.95rem; }
    table.hpv-table thead th {
      position:sticky; top:0; z-index:1; background:linear-gradient(0deg,#fff,#fff 70%,#f8fafc);
      padding:.75rem .75rem; text-align:right; color:var(--ink-3); font-weight:800; letter-spacing:.2px;
    }
    table.hpv-table tbody td { padding:.75rem .75rem; border-top:1px solid #f1f5f9; color:#0f172a; }
    table.hpv-table tbody tr:nth-child(odd) { background:#fcfcfd; }
    table.hpv-table tbody tr:hover { background:#f5f7fb; }
    table.hpv-table thead th:first-child { border-top-right-radius:1rem; }
    table.hpv-table thead th:last-child { border-top-left-radius:1rem; }

    /* Page header bar (count + quick totals) */
    .hpv-topline {
      display:flex; flex-wrap:wrap; gap:.6rem 1rem; align-items:center; margin: .4rem .25rem .9rem;
    }
    .hpv-topline .count { font-size:.85rem; color:var(--ink-3); }

    /* Filters grid spacing on small screens */
    @media (max-width: 767px) {
      .hpv-grid { display:grid; grid-template-columns: 1fr; gap: .65rem; }
    }
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

/** ─────────────────────────────────  Component  ───────────────────────────────── */
export default function MyRecordsSmart({ email, rows, onExport }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    q: "",
    sortBy: "date",
    dir: "desc",
  });

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
      ) {
        return false;
      }
      return true;
    });
  }, [rows, email, filters.from, filters.to, filters.q]);

  /** 2) DE-DUPE: keep only one row per (date, center, school). If a row has ts, latest wins. */
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

  /** 4) Totals after de-dupe + filters */
  const totals = useMemo(() => {
    return sorted.reduce(
      (acc, r) => {
        acc.v += Number(r.vaccinated) || 0;
        acc.r += Number(r.refused) || 0;
        acc.a += Number(r.absent) || 0;
        acc.u += Number(r.unvaccinated) || 0;
        return acc;
      },
      { v: 0, r: 0, a: 0, u: 0 }
    );
  }, [sorted]);

  function clearFilters() {
    setFilters({ from: "", to: "", q: "", sortBy: "date", dir: "desc" });
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
          {/* Topline chips (quick totals + export) */}
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
                title="تصدير السجلات المفلترة"
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
                </tr>
              </thead>
              <tbody>
                {sorted.slice(-500).map((r) => (
                  <tr key={`${r.date}|${r.center}|${r.school}`}>
                    <td className="whitespace-nowrap">{r.date}</td>
                    <td>{r.center}</td>
                    <td>{r.school}</td>
                    <td>{r.vaccinated}</td>
                    <td>{r.refused}</td>
                    <td>{r.absent}</td>
                    <td>{r.unvaccinated}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-8">
                      لا توجد سجلات مطابقة للفلاتر الحالية.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
