import React, { useMemo, useState } from "react";

/* Local, Arabic-friendly styles kept inside this component only */
const LocalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
    .hpv-screen, .hpv-screen * {
      font-family: "Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important;
    }

    .hpv-card { background:#fff; border-radius:1rem; box-shadow: 0 8px 24px rgba(0,0,0,.04); }
    .hpv-card .hd { display:flex; align-items:center; gap:.75rem; padding: .9rem 1rem .3rem; }
    .hpv-card .hd .title { font-weight:800; color:var(--brand-dark); }
    .hpv-card .body { padding: .75rem 1rem 1rem; }

    .hpv-input, .hpv-select {
      border-radius: .9rem; padding: .6rem .9rem; border: 1px solid #e5e7eb; background:#fff;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    .hpv-input:focus, .hpv-select:focus {
      outline:none; border-color: var(--brand);
      box-shadow: 0 0 0 3px #3AC0C326;
    }
    .hpv-label { font-size:.85rem; color:#374151; margin-bottom:.35rem; }

    .hpv-btn {
      border-radius: 999px; padding: .55rem 1rem; font-weight:600;
      transition: background .15s ease, box-shadow .15s ease, transform .15s ease;
    }
    .hpv-btn-primary {
      background: linear-gradient(135deg, var(--brand), var(--brand-dark)); color:#fff;
      box-shadow: 0 6px 16px rgba(22,145,208,.25);
    }
    .hpv-btn-primary:hover {
      background: linear-gradient(135deg, var(--brand-dark), var(--brand));
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(18,111,167,.28);
    }
    .hpv-btn-ghost { background:#fff; border:1px solid #e5e7eb; color:#374151; }
    .hpv-btn-ghost:hover { background:#f9fafb; border-color:#d1d5db; }

    table.hpv-table { width:100%; border-collapse:separate; border-spacing:0; font-size:.95rem; }
    table.hpv-table thead th {
      padding:.7rem .6rem; text-align:right; color:#4b5563; font-weight:700; background:#f9fafb;
      position:sticky; top:0; z-index:1;
    }
    table.hpv-table tbody td { padding:.7rem .6rem; border-top:1px solid #f1f5f9; }
    table.hpv-table tbody tr:hover { background:#fcfcfd; }
    .hpv-table-wrap { overflow:auto; border:1px solid #eef2f7; border-radius: .9rem; }
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

export default function MyRecordsSmart({ email, rows }) {
  const [filters, setFilters] = useState({
    from: "", to: "", q: "", sortBy: "date", dir: "desc",
  });

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (r.email !== email) return false;
        if (filters.from && r.date < filters.from) return false;
        if (filters.to && r.date > filters.to) return false;
        const q = filters.q.trim();
        if (q && !(r.center.includes(q) || r.school.includes(q))) return false;
        return true;
      }),
    [rows, email, filters.from, filters.to, filters.q]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = filters.dir === "asc" ? 1 : -1;
    if (filters.sortBy === "vaccinated")
      arr.sort((a, b) => (a.vaccinated - b.vaccinated) * dir);
    else if (filters.sortBy === "unvaccinated")
      arr.sort((a, b) => (a.unvaccinated - b.unvaccinated) * dir);
    else
      arr.sort((a, b) => a.date.localeCompare(b.date) * dir);
    return arr;
  }, [filtered, filters.sortBy, filters.dir]);

  function clearFilters() {
    setFilters({ from: "", to: "", q: "", sortBy: "date", dir: "desc" });
  }

  return (
    <section className="hpv-screen">
      <LocalStyles />

      <div className="hpv-card">
        <div className="hd">
          <div className="title">سجلاتي</div>
          <div className="ml-auto text-xs text-gray-500">
            {sorted.length} سجلّ
          </div>
        </div>

        <div className="body">
          {/* Filters */}
          <div className="grid gap-3 md:grid-cols-5 items-end mb-3">
            <Field label="من">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((x) => ({ ...x, from: e.target.value }))}
                className="hpv-input"
              />
            </Field>
            <Field label="إلى">
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((x) => ({ ...x, to: e.target.value }))}
                className="hpv-input"
              />
            </Field>
            <Field label="بحث">
              <input
                placeholder="ابحث في المركز/المدرسة"
                value={filters.q}
                onChange={(e) => setFilters((x) => ({ ...x, q: e.target.value }))}
                className="hpv-input"
              />
            </Field>
            <Field label="ترتيب حسب">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((x) => ({ ...x, sortBy: e.target.value }))}
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
                onChange={(e) => setFilters((x) => ({ ...x, dir: e.target.value }))}
                className="hpv-select"
              >
                <option value="desc">الأكثر</option>
                <option value="asc">الأقل</option>
              </select>
            </Field>
          </div>

          <div className="flex gap-2 mb-3">
            <button type="button" className="hpv-btn hpv-btn-primary" onClick={() => { /* noop: already reactive */ }}>
              تطبيق
            </button>
            <button type="button" className="hpv-btn hpv-btn-ghost" onClick={clearFilters}>
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
                {sorted.slice(-500).map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
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
                    <td colSpan={7} className="text-center text-gray-500 py-6">
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
