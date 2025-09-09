import React, { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

/* Local, Arabic-friendly styles kept inside this component only */
const LocalStyles = () => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
      @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
      .hpv-screen, .hpv-screen * {
        font-family: "Tajawal","Noto Kufi Arabic","Cairo",system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif !important;
      }
      .hpv-card { background:#fff; border-radius:1rem; box-shadow: 0 8px 24px rgba(0,0,0,.04); }
      .hpv-card .hd { display:flex; align-items:center; gap:.75rem; padding: .9rem 1rem .3rem; }
      .hpv-card .hd .title { font-weight:800; color:var(--brand-dark); }
      .hpv-card .body { padding: .75rem 1rem 1rem; }
      .hpv-btn { border-radius: 999px; padding: .55rem 1rem; font-weight:600; transition: background .15s ease, box-shadow .15s ease, transform .15s ease; }
      .hpv-btn-primary { background: linear-gradient(135deg, #1691d0, #165b93); color:#fff; box-shadow: 0 6px 16px rgba(22,145,208,.25); }
      .hpv-btn-primary:hover { background: linear-gradient(135deg, #165b93, #1691d0); transform: translateY(-1px); box-shadow: 0 8px 18px rgba(18,111,167,.28); }
      table.hpv-table { width:100%; border-collapse:separate; border-spacing:0; font-size:.95rem; }
      table.hpv-table thead th { padding:.7rem .6rem; text-align:right; color:#4b5563; font-weight:700; background:#f9fafb; position:sticky; top:0; z-index:1; }
      table.hpv-table tbody td { padding:.7rem .6rem; border-top:1px solid #f1f5f9; }
      table.hpv-table tbody tr:hover { background:#fcfcfd; }
      .hpv-table-wrap { overflow:auto; border:1px solid #eef2f7; border-radius: .9rem; }
      .hpv-input { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; transition: border-color 0.2s; }
      .hpv-input:focus { outline: none; border-color: #1691d0; }
    `}</style>
  </>
);

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="hpv-label text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// Row that displays data but does not allow editing
function ReadOnlyRow({ record }) {
  return (
    <tr key={record.uid}>
      <td>{record.date}</td>
      <td>{record.center}</td>
      <td>{record.school}</td>
      <td>{record.vaccinated}</td>
      <td>{record.refused}</td>
      <td>{record.absent}</td>
      <td>{(record.refused || 0) + (record.absent || 0)}</td>
    </tr>
  );
}

export default function MyRecordsSmart({ email, rows }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    q: "",
    sortBy: "date",
    dir: "desc",
    entryType: "", // New filter for "نوع الإدخال"
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRecords(rows);
    setLoading(false);
  }, [rows]);

  // Filter by entry type (either schools or other centers)
  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (r.email !== email) return false;
        if (filters.from && r.date < filters.from) return false;
        if (filters.to && r.date > filters.to) return false;
        const q = filters.q.trim();
        if (q && !(r.center?.includes(q) || r.school?.includes(q))) return false;

        // Filter by "نوع الإدخال" (entry type)
        if (filters.entryType === "مطعمين داخل المدارس" && !r.school) return false;
        if (filters.entryType === "أماكن أخرى" && r.school) return false;

        return true;
      }),
    [records, email, filters.from, filters.to, filters.q, filters.entryType]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = filters.dir === "asc" ? 1 : -1;
    if (filters.sortBy === "vaccinated")
      arr.sort((a, b) => (a.vaccinated - b.vaccinated) * dir);
    else if (filters.sortBy === "unvaccinated")
      arr.sort((a, b) => (a.unvaccinated - b.unvaccinated) * dir);
    else arr.sort((a, b) => (a.date?.localeCompare(b.date)) * dir);
    return arr;
  }, [filtered, filters.sortBy, filters.dir]);

  const exportToExcel = () => {
    const arabicHeaders = {
      date: "التاريخ",
      email: "البريد الإلكتروني",
      facility: "المنشأة",
      clinic_name: "اسم العيادة",
      school_name: "اسم المدرسة",
      center: "المركز",
      school: "المدرسة",
      vaccinated: "المطعّم",
      refused: "رفض",
      absent: "غياب",
      unvaccinated: "غير مطعّم",
      schoolTotal: "إجمالي المدرسة",
      ts: "الطابع الزمني",
    };

    const dataWithArabicHeaders = sorted.map((row) => {
      const translatedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (arabicHeaders[key]) {
          translatedRow[arabicHeaders[key]] = value;
        }
      }
      return translatedRow;
    });

    const ws = window.XLSX.utils.json_to_sheet(dataWithArabicHeaders);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "سجلاتي");
    window.XLSX.writeFile(wb, "sijilat_arabic.xlsx");
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      from: "",
      to: "",
      q: "",
      sortBy: "date",
      dir: "desc",
      entryType: "",
    });
  };

  return (
    <section className="hpv-screen p-4">
      <LocalStyles />
      <div className="hpv-card">
        <div className="hd">
          <div className="title">سجلاتي</div>
          <div className="ml-auto text-xs text-gray-500">
            {loading ? "جاري التحميل..." : `${sorted.length} سجلّ`}
          </div>
        </div>
        <div className="body">
          {error && <div className="text-red-500 mb-4">{error}</div>}

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

            

            <div className="flex gap-2 mb-3 md:col-span-2">
              <button
                type="button"
                className="hpv-btn hpv-btn-primary"
                onClick={exportToExcel}
              >
                تصدير إلى Excel
              </button>
              <button
                type="button"
                className="hpv-btn hpv-btn-ghost"
                onClick={clearFilters}
              >
                تصفية البحث
              </button>
            </div>
          </div>

          <div className="hpv-table-wrap">
            <table className="hpv-table text-sm">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المركز</th>
                  <th>المكان</th>
                  <th>مطعّم</th>
                  <th>رفض</th>
                  <th>غياب</th>
                  <th>غير مطعّم</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-6">
                      <i className="fas fa-spinner fa-spin text-xl mb-2"></i>
                      <div className="text-sm">جاري تحميل السجلات...</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {sorted.slice(-500).map((r) => (
                      <ReadOnlyRow key={r.uid} record={r} />
                    ))}
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-6">
                          لا توجد سجلات مطابقة للفلاتر الحالية.
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
