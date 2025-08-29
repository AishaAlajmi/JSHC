
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { META, FACILITIES } from "../data/meta";

const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log("[Dashboard]", ...args); };

function Card({ title, children, actions }) {
  return (
    <div className="p-4 rounded-2xl shadow bg-white">
      <div className="flex items-center gap-2 mb-2">
        {title && <div className="font-semibold">{title}</div>}
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}
function KPI({ label, value }) {
  return (
    <div className="p-4 rounded-2xl shadow bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function Dashboard({ responses, onExport, schoolInfo, onUpdateSchoolInfo }) {
  const [filters, setFilters] = useState({ from: "", to: "", facility: "" });

  const filtered = useMemo(() => {
    const out = responses.filter(r => {
      const inDate = (!filters.from || r.date >= filters.from) && (!filters.to || r.date <= filters.to);
      const inFac = !filters.facility || r.facility === filters.facility;
      return inDate && inFac;
    });
    log("filtered", { count: out.length, filters });
    return out;
  }, [responses, filters]);

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    vaccinated: acc.vaccinated + (r.vaccinated||0),
    refused: acc.refused + (r.refused||0),
    absent: acc.absent + (r.absent||0),
    unvaccinated: acc.unvaccinated + (r.unvaccinated||0),
  }), { vaccinated: 0, refused: 0, absent: 0, unvaccinated: 0 }), [filtered]);

  const byCenter = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = r.facility + "::" + r.center;
      if (!map.has(key)) map.set(key, { facility: r.facility, center: r.center, vaccinated: 0, unvaccinated: 0 });
      const x = map.get(key);
      x.vaccinated += r.vaccinated||0; x.unvaccinated += r.unvaccinated||0;
    }
    return Array.from(map.values());
  }, [filtered]);

  const chartData = byCenter.map(c => ({ name: `${c.facility}\n${c.center}`, vaccinated: c.vaccinated, unvaccinated: c.unvaccinated }));

  const allSchools = useMemo(() => Object.values(META.schoolsByCenter).flat(), []);
  const [editSchool, setEditSchool] = useState("");
  const [info, setInfo] = useState({ sex: "", authority: "", stage: "", schoolTotal: "" });
  useEffect(()=>{
    const cur = schoolInfo[editSchool] || { sex: "", authority: "", stage: "", schoolTotal: "" };
    log("editSchool->info", editSchool, cur);
    setInfo(cur);
  }, [editSchool, schoolInfo]);

  function saveInfo() {
    const map = { ...schoolInfo, [editSchool]: { ...info, schoolTotal: Number(info.schoolTotal)||0 } };
    log("saveInfo", { school: editSchool, data: map[editSchool] });
    onUpdateSchoolInfo(map);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-sm">من تاريخ</label>
          <input type="date" value={filters.from} onChange={(e)=>setFilters(x=>({...x,from:e.target.value}))} className="border rounded-xl px-3 py-2"/>
        </div>
        <div className="flex flex-col">
          <label className="text-sm">إلى تاريخ</label>
          <input type="date" value={filters.to} onChange={(e)=>setFilters(x=>({...x,to:e.target.value}))} className="border rounded-xl px-3 py-2"/>
        </div>
        <div className="flex flex-col min-w-[220px]">
          <label className="text-sm">المنشأة الصحية</label>
          <select value={filters.facility} onChange={(e)=>setFilters(x=>({...x,facility:e.target.value}))} className="border rounded-xl px-3 py-2">
            <option value="">الكل</option>
            {FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="مطعّم" value={totals.vaccinated} />
        <KPI label="رفض" value={totals.refused} />
        <KPI label="غياب" value={totals.absent} />
        <KPI label="غير مطعّم" value={totals.unvaccinated} />
      </div>

      <Card title="حسب المركز">
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="vaccinated" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="unvaccinated" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="أحدث السجلات" actions={<button onClick={()=>{ log("export", filtered.length); onExport(filtered); }} className="px-4 py-2 rounded-2xl shadow border hover:bg-gray-50">حفظ كـ Excel</button>}>
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
              {filtered.slice(-300).reverse().map((r,i)=> (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="p-2 whitespace-nowrap">{r.date}</td>
                  <td className="p-2">{r.facility}</td>
                  <td className="p-2">{r.center}</td>
                  <td className="p-2">{r.school}</td>
                  <td className="p-2">{r.sex||""}</td>
                  <td className="p-2">{r.authority||""}</td>
                  <td className="p-2">{r.stage||""}</td>
                  <td className="p-2">{r.schoolTotal||0}</td>
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

      <Card title="إدارة خصائص المدارس" actions={<button onClick={saveInfo} className="px-3 py-1 rounded-xl border">حفظ</button>}>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-sm">اختر مدرسة</label>
            <select value={editSchool} onChange={(e)=>setEditSchool(e.target.value)} className="border rounded-xl px-3 py-2">
              <option value="">— اختر —</option>
              {allSchools.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm">الجنس</label>
            <select value={info.sex} onChange={(e)=>setInfo(x=>({...x,sex:e.target.value}))} className="border rounded-xl px-3 py-2">
              <option value="">—</option>
              <option value="بنات">بنات</option>
              <option value="بنين">بنين</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm">السلطة</label>
            <select value={info.authority} onChange={(e)=>setInfo(x=>({...x,authority:e.target.value}))} className="border rounded-xl px-3 py-2">
              <option value="">—</option>
              <option value="حكومي">حكومي</option>
              <option value="أهلي">أهلي</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm">المرحلة</label>
            <select value={info.stage} onChange={(e)=>setInfo(x=>({...x,stage:e.target.value}))} className="border rounded-xl px-3 py-2">
              <option value="">—</option>
              <option value="رياض أطفال">رياض أطفال</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="متوسط">متوسط</option>
              <option value="ثانوي">ثانوي</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm">العدد الإجمالي للمدرسة</label>
            <input type="number" min="0" value={info.schoolTotal} onChange={(e)=>setInfo(x=>({...x,schoolTotal:e.target.value}))} className="border rounded-xl px-3 py-2"/>
          </div>
        </div>
      </Card>
    </div>
  );
}
