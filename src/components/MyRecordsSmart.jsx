// =============================
// src/components/MyRecordsSmart.jsx
// User-side records list with filters
// =============================

import React, { useMemo, useState } from "react";
import { Card } from "./common/UI";

const DEBUG2 = true;
const log2 = (...args) => DEBUG2 && console.log("[MyRecordsSmart]", ...args);

export default function MyRecordsSmart({ email, rows }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    q: "",
    sortBy: "date",
    dir: "desc",
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
    else arr.sort((a, b) => a.date.localeCompare(b.date) * dir);
    log2("sorted", { count: arr.length, sortBy: filters.sortBy, dir: filters.dir });
    return arr;
  }, [filtered, filters.sortBy, filters.dir]);

  return (
    <Card title="سجلاتي">
      <div className="flex flex-wrap gap-2 mb-3 items-end">
        <div className="flex flex-col">
          <label className="text-sm">من</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((x) => ({ ...x, from: e.target.value }))}
            className="border rounded-xl px-3 py-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">إلى</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((x) => ({ ...x, to: e.target.value }))}
            className="border rounded-xl px-3 py-2"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">بحث</label>
          <input
            placeholder="ابحث في المركز/المدرسة"
            value={filters.q}
            onChange={(e) => setFilters((x) => ({ ...x, q: e.target.value }))}
            className="border rounded-xl px-3 py-2 md:min_w-[260px]"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">ترتيب حسب</label>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((x) => ({ ...x, sortBy: e.target.value }))}
            className="border rounded-xl px-3 py-2"
          >
            <option value="date">التاريخ</option>
            <option value="vaccinated">مطعّم</option>
            <option value="unvaccinated">غير مطعّم</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm">الاتجاه</label>
          <select
            value={filters.dir}
            onChange={(e) => setFilters((x) => ({ ...x, dir: e.target.value }))}
            className="border rounded-xl px-3 py-2"
          >
            <option value="desc">الأكثر</option>
            <option value="asc">الأقل</option>
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right border-b">
              <th className="p-2">التاريخ</th>
              <th className="p-2">المركز</th>
              <th className="p-2">المدرسة</th>
              <th className="p-2">مطعّم</th>
              <th className="p-2">رفض</th>
              <th className="p-2">غياب</th>
              <th className="p-2">غير مطعّم</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(-500).map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-2 whitespace-nowrap">{r.date}</td>
                <td className="p-2">{r.center}</td>
                <td className="p-2">{r.school}</td>
                <td className="p-2">{r.vaccinated}</td>
                <td className="p-2">{r.refused}</td>
                <td className="p-2">{r.absent}</td>
                <td className="p-2">{r.unvaccinated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


