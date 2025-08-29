// src/components/Dashboard.jsx
// Rewrites the Latest Records area so it reflects *live* form submissions
// and stays in sync with the `responses` prop.

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "./common/UI";

export default function Dashboard({ responses = [], onExport, schoolInfo, onUpdateSchoolInfo }) {
  // why: some older dashboard versions used a local copy → got stale.
  const [rows, setRows] = useState(Array.isArray(responses) ? responses : []);
  useEffect(() => {
    setRows(Array.isArray(responses) ? responses : []);
  }, [responses]);

  // Latest records (newest first)
  const latest = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => b.date.localeCompare(a.date));
    return arr; // slice/limit in the table if you want
  }, [rows]);

  function exportLatest() {
    if (typeof onExport === "function") onExport(latest);
  }

  return (
    <div className="grid gap-4">
      {/* Latest Records */}
      <Card
        title="أحدث السجلات"
        actions={
          <button className="btn btn-ghost" onClick={exportLatest}>
            حفظ ≤ Excel
          </button>
        }
      >
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-right border-b">
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
              {latest.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 whitespace-nowrap">{r.date}</td>
                  <td className="p-2">{r.facility}</td>
                  <td className="p-2">{r.center}</td>
                  <td className="p-2">{r.school}</td>
                  <td className="p-2">{r.sex}</td>
                  <td className="p-2">{r.authority}</td>
                  <td className="p-2">{r.stage}</td>
                  <td className="p-2">{r.schoolTotal}</td>
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

      {/* Placeholder: keep your other dashboard sections here if any */}
    </div>
  );
}
