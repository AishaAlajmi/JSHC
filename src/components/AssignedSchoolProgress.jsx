import React, { useMemo } from "react";

/** Build a stable key for (center + school) */
const key = (center, school) => `${center}||${school}`;

/**
 * Make a dictionary from assigned (META) schools:
 *   key(center,school) -> { center, school, total, gender, authority, stage }
 */
function indexAssigned(assignedList = []) {
  const map = new Map();
  assignedList.forEach((s) => {
    map.set(
      key(s.center, s.school),
      {
        center: s.center,
        school: s.school,
        total: Number(s.total || 0) || 0,
        gender: s.gender || null,
        authority: s.authority || null,
        stage: s.stage || null,
      }
    );
  });
  return map;
}

/**
 * Sum up vaccinated (and optionally refused/absent) from user rows for the same (center+school).
 */
function summarizeProgress(rows = [], email) {
  const prog = new Map();

  rows.forEach((r) => {
    // only that user's entries (you can relax this if needed)
    if ((r.email || "").toLowerCase() !== (email || "").toLowerCase()) return;

    const center = r.center || r.clinic_name || "";
    const school = r.school || r.school_name || "";
    if (!center || !school) return;

    const k = key(center, school);
    if (!prog.has(k)) {
      prog.set(k, {
        vaccinated: 0,
        refused: 0,
        absent: 0,
      });
    }
    const ref = prog.get(k);
    ref.vaccinated += Number(r.vaccinated || 0);
    ref.refused += Number(r.refused || 0);
    ref.absent += Number(r.absent || 0);
  });

  return prog;
}

/**
 * Join assigned schools (from META) with progress (from responses).
 * “remaining” = total - vaccinated (you can switch to total - (vaccinated+refused+absent) if you prefer).
 */
function computeAssignedProgress(assignedMap, progressMap) {
  const out = [];

  // iterate over all assigned schools so they always appear
  for (const [k, meta] of assignedMap.entries()) {
    const p = progressMap.get(k) || { vaccinated: 0, refused: 0, absent: 0 };
    const remaining = Math.max((meta.total || 0) - (p.vaccinated || 0), 0);

    out.push({
      center: meta.center,
      school: meta.school,
      total: meta.total,
      vaccinated: p.vaccinated,
      refused: p.refused,
      absent: p.absent,
      remaining,
      // mark completed only if meta has a positive إجمالي
      completed: meta.total > 0 && p.vaccinated >= meta.total,
      gender: meta.gender,
      authority: meta.authority,
      stage: meta.stage,
    });
  }

  // sort: not completed first, then most remaining
  out.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (b.remaining || 0) - (a.remaining || 0);
  });

  return out;
}

export default function AssignedSchoolProgress({ META, facility, rows, email }) {
  const items = useMemo(() => {
    // 1) assigned list from META for this facility
    const assigned = Array.isArray(META?.[facility]) ? META[facility] : [];

    // 2) index assigned + summarize progress from responses
    const assignedMap = indexAssigned(assigned);
    const progressMap = summarizeProgress(rows, email);

    // 3) join
    return computeAssignedProgress(assignedMap, progressMap);
  }, [META, facility, rows, email]);

  const done = items.filter(i => i.completed).length;
  const total = items.length;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="font-semibold text-slate-800">إنجاز المدارس المكلّف بها</div>
        <div className="ml-auto text-sm text-slate-500">مكتمل: {done} / {total}</div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-right">
              <th className="p-2">المركز</th>
              <th className="p-2">المدرسة</th>
              <th className="p-2">إجمالي</th>
              <th className="p-2">مطعّم</th>
              <th className="p-2">المتبقي</th>
              <th className="p-2">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const rowKey = `${r.center}|${r.school}`;
              return (
                <tr key={rowKey} className="border-b hover:bg-slate-50">
                  <td className="p-2">{r.center}</td>
                  <td className="p-2">
                    <div className="font-medium">{r.school}</div>
                    <div className="text-xs text-slate-500">
                      {r.gender ? `• ${r.gender}` : ""} {r.authority ? `• ${r.authority}` : ""} {r.stage ? `• ${r.stage}` : ""}
                    </div>
                  </td>
                  <td className="p-2">{r.total}</td>
                  <td className="p-2">{r.vaccinated}</td>
                  <td className="p-2">{r.remaining}</td>
                  <td className="p-2">
                    {r.total === 0 ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-slate-50 text-slate-700 border border-slate-200">
                        لا يوجد إجمالي
                      </span>
                    ) : r.completed ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                        مكتمل
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                        غير مكتمل
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-3 text-center text-slate-500">لا توجد مدارس مكلّف بها في القائمة.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Optional: small legend */}
      <div className="mt-2 text-xs text-slate-500">
        الحالة تعتمد على مقارنة "مطعّم" مقابل "إجمالي" من ملف meta.js. المتبقي = إجمالي − مطعّم.
      </div>
    </div>
  );
}
