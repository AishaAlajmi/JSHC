// File: src/components/Dashboard.jsx
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LabelList,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import ReactECharts from "echarts-for-react";

// ===== ألوان عامة =====
const C = {
  sky: "#0ea5e9",
  skyLight: "#e0f2fe",
  emerald: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  slate: "#94a3b8",
  ink: "#0f172a",
};

// ===== لبنات واجهة بسيطة =====
const Wrap = ({ children }) => (
  <div className="space-y-5">
    <div className="rounded-2xl p-5 bg-slate-900 text-white shadow">
      <div className="text-xl font-semibold">لوحة المدير — متابعة التطعيم</div>
      <div className="text-white/70 text-sm">
        عرض المستشفيات والمراكز والمدارس مع الأهداف
      </div>
    </div>
    {children}
  </div>
);
function Card({ title, subtitle, actions, pad = true, children }) {
  return (
    <div className="rounded-2xl shadow bg-white">
      <div className="flex items-center gap-2 px-4 pt-3">
        {title && <div className="font-semibold">{title}</div>}
        {subtitle && (
          <div className="text-sm text-slate-500 ml-2">{subtitle}</div>
        )}
        <div className="ml-auto flex gap-2">{actions}</div>
      </div>
      <div className={pad ? "p-4" : ""}>{children}</div>
    </div>
  );
}
function KPI({ label, value, hint, tone = "sky" }) {
  const toneMap = {
    sky: `bg-sky-50 text-sky-700 border-sky-100`,
    emerald: `bg-emerald-50 text-emerald-700 border-emerald-100`,
    red: `bg-rose-50 text-rose-700 border-rose-100`,
    amber: `bg-amber-50 text-amber-700 border-amber-100`,
    slate: `bg-slate-50 text-slate-700 border-slate-100`,
  };
  return (
    <div className={`rounded-2xl p-4 border ${toneMap[tone]}`}>
      <div className="text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {hint && <div className="text-xs mt-1 opacity-80">{hint}</div>}
    </div>
  );
}

// ===== مساعدين =====
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (n) => Number(n || 0).toLocaleString("ar-EG");
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));
const dateKey = (d) => (d || "").slice(0, 10);

// نوع الجهة: مدارس / سجون / أخرى
const typeOfRow = (r) => {
  const s =
    (r.school || "") + " " + (r.authority || "") + " " + (r.stage || "");
  if (/[سس]جن|نزيل|إصلاحية/.test(s)) return "سجون";
  if (/مدرس/.test(s) || r.stage || r.school) return "مدارس";
  return "أخرى";
};

// ألوان إنجاز الهدف (تقدّم نحو 70% من إجمالي الطلاب)
const progressColor = (p) => {
  if (p >= 100) return C.emerald; // حقق الهدف أو تجاوز
  if (p >= 80) return "#34d399"; // قريب جدًا
  if (p >= 50) return C.amber; // متوسط
  return C.red; // متدنّي
};

// ====== Mind-map (شجري) ======
const MM_COLORS = {
  good: "#10b981",
  mid: "#f59e0b",
  bad: "#ef4444",
  node: "#94a3b8",
};
const mmColor = (p) =>
  p >= 80 ? MM_COLORS.good : p >= 50 ? MM_COLORS.mid : MM_COLORS.bad;

const withExpanded = (node) => {
  const n = { ...node, collapsed: false };
  if (n.children) n.children = n.children.map(withExpanded);
  return n;
};

function buildMindMapTree(rows) {
  const byFac = new Map();
  for (const r of rows) {
    const f = r.facility || "غير محدد";
    const c = r.center || "—";
    const s = r.school || "—";
    if (!byFac.has(f)) byFac.set(f, new Map());
    const byCtr = byFac.get(f);
    if (!byCtr.has(c)) byCtr.set(c, new Map());
    const bySch = byCtr.get(c);
    if (!bySch.has(s))
      bySch.set(s, { vaccinated: 0, unvaccinated: 0, refused: 0, absent: 0 });
    const x = bySch.get(s);
    x.vaccinated += num(r.vaccinated);
    x.unvaccinated += num(r.unvaccinated);
    x.refused += num(r.refused);
    x.absent += num(r.absent);
  }

  const hospitals = [];
  for (const [fac, ctrMap] of byFac.entries()) {
    let facV = 0,
      facD = 0;
    const centers = [];

    for (const [ctr, schMap] of ctrMap.entries()) {
      let ctrV = 0,
        ctrD = 0;
      const schools = [];

      for (const [sch, agg] of schMap.entries()) {
        const den =
          agg.vaccinated + agg.unvaccinated + agg.refused + agg.absent;
        const cover = pct(agg.vaccinated, den);
        ctrV += agg.vaccinated;
        ctrD += den;

        schools.push({
          name: `${sch}`,
          value: agg.vaccinated,
          label: {
            formatter: (p) =>
              `{n|${p.name}}  {v|${agg.vaccinated.toLocaleString(
                "ar-EG"
              )} مطعّم}`,
            rich: {
              n: { fontSize: 12, color: "#0f172a" },
              v: {
                fontSize: 12,
                fontWeight: 600,
                color: "#0f172a",
                backgroundColor: "#f1f5f9",
                padding: [2, 6],
                borderRadius: 999,
              },
            },
            position: "right",
            align: "left",
            overflow: "truncate",
            width: 260,
          },
          itemStyle: { color: mmColor(cover) },
        });
      }

      const ctrCover = pct(ctrV, ctrD);
      centers.push({
        name: `${ctr}`,
        value: ctrV,
        label: {
          formatter: (p) =>
            `{h|${p.name}}  {v|${ctrV.toLocaleString("ar-EG")} مطعّم}`,
          rich: {
            h: { fontWeight: 700, color: "#0f172a" },
            v: {
              fontSize: 12,
              fontWeight: 700,
              color: "#0f172a",
              backgroundColor: "#e0f2fe",
              padding: [2, 8],
              borderRadius: 999,
            },
          },
          position: "right",
          align: "left",
          width: 280,
          overflow: "truncate",
        },
        itemStyle: { color: mmColor(ctrCover) },
        children: schools.sort((a, b) => b.value - a.value),
      });

      facV += ctrV;
      facD += ctrD;
    }

    const facCover = pct(facV, facD);
    hospitals.push({
      name: `${fac}`,
      value: facV,
      label: {
        formatter: (p) =>
          `{hh|${p.name}}  {v|${facV.toLocaleString("ar-EG")} مطعّم}`,
        rich: {
          hh: { fontWeight: 800, color: "#0f172a" },
          v: {
            fontSize: 12,
            fontWeight: 800,
            color: "#0f172a",
            backgroundColor: "#dcfce7",
            padding: [2, 8],
            borderRadius: 999,
          },
        },
        position: "right",
        align: "left",
        width: 300,
        overflow: "truncate",
      },
      itemStyle: { color: mmColor(facCover) },
      children: centers.sort((a, b) => b.value - a.value),
    });
  }

  const root =
    hospitals.length === 1
      ? withExpanded(hospitals[0])
      : withExpanded({
          name: "المستشفيات",
          value: 0,
          label: { fontWeight: 700, color: "#0f172a" },
          itemStyle: { color: MM_COLORS.node },
          children: hospitals.sort((a, b) => b.value - a.value),
        });

  return [root];
}

// ===== المكوّن الرئيسي =====
export default function Dashboard({ responses = [] }) {
  // فلاتر
  const [filters, setFilters] = useState({ from: "", to: "", facility: "" });
  const [viz, setViz] = useState("tree"); // tree | sunburst (لو حبّيت ترجعها)

  const allFacilities = useMemo(
    () => unique(responses.map((r) => r.facility)),
    [responses]
  );

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      const inDate =
        (!filters.from || r.date >= filters.from) &&
        (!filters.to || r.date <= filters.to);
      const inFac = !filters.facility || r.facility === filters.facility;
      return inDate && inFac;
    });
  }, [responses, filters]);

  // مجاميع عامة
  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, r) => ({
          vaccinated: a.vaccinated + num(r.vaccinated),
          unvaccinated: a.unvaccinated + num(r.unvaccinated),
          refused: a.refused + num(r.refused),
          absent: a.absent + num(r.absent),
        }),
        { vaccinated: 0, unvaccinated: 0, refused: 0, absent: 0 }
      ),
    [filtered]
  );
  const denom =
    totals.vaccinated + totals.unvaccinated + totals.refused + totals.absent;
  const cov = pct(totals.vaccinated, denom);
  const refusalRate = pct(totals.refused, denom);
  const absenceRate = pct(totals.absent, denom);

  // اتجاه زمني
  const byDate = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const k = dateKey(r.date);
      if (!m.has(k)) m.set(k, { date: k, vaccinated: 0, unvaccinated: 0 });
      const x = m.get(k);
      x.vaccinated += num(r.vaccinated);
      x.unvaccinated += num(r.unvaccinated);
    });
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  // ===== حساب هدف 70% لكل مستشفى =====
  // نبني (facility → school → max(schoolTotal)) لتجنّب العد المكرر
  const hospitalTotals = useMemo(() => {
    const facMap = new Map();
    filtered.forEach((r) => {
      const f = r.facility || "-";
      const s = r.school || "-";
      const st = num(r.schoolTotal);
      if (!facMap.has(f)) facMap.set(f, new Map());
      const schools = facMap.get(f);
      const prev = schools.get(s) || 0;
      if (st > prev) schools.set(s, st);
    });
    // الناتج: facility → { studentTotal, target(70%), vaccinated }
    const byFac = new Map();
    filtered.forEach((r) => {
      const f = r.facility || "-";
      if (!byFac.has(f)) byFac.set(f, { students: 0, vaccinated: 0 });
      byFac.get(f).vaccinated += num(r.vaccinated);
    });
    for (const [f, schools] of facMap.entries()) {
      const students = Array.from(schools.values()).reduce((a, b) => a + b, 0);
      if (!byFac.has(f)) byFac.set(f, { students, vaccinated: 0 });
      byFac.get(f).students = students;
    }
    const out = [];
    for (const [f, v] of byFac.entries()) {
      const target = Math.round(v.students * 0.7);
      out.push({
        facility: f,
        students: v.students,
        target,
        achieved: v.vaccinated,
        progressToTarget:
          target > 0 ? Math.round((v.vaccinated / target) * 100) : 0,
      });
    }
    return out.sort((a, b) => b.achieved - a.achieved);
  }, [filtered]);

  // مقارنة المراكز حسب عدد المطعّمين
  const centerCompare = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const k = r.center || "—";
      if (!m.has(k))
        m.set(k, { name: k, vaccinated: 0, refused: 0, absent: 0 });
      const x = m.get(k);
      x.vaccinated += num(r.vaccinated);
      x.refused += num(r.refused);
      x.absent += num(r.absent);
    });
    return Array.from(m.values()).sort((a, b) => b.vaccinated - a.vaccinated);
  }, [filtered]);

  // تفصيل المدارس داخل كل مركز (إذا تم اختيار مستشفى)
  const centersDetail = useMemo(() => {
    if (!filters.facility) return [];
    const m = new Map(); // center -> { totalVacc, schools[] }
    filtered.forEach((r) => {
      if (r.facility !== filters.facility) return;
      const c = r.center || "—";
      if (!m.has(c)) m.set(c, { center: c, vaccinated: 0, schools: new Map() });
      const x = m.get(c);
      x.vaccinated += num(r.vaccinated);
      const s = r.school || "—";
      if (!x.schools.has(s))
        x.schools.set(s, {
          name: s,
          vaccinated: 0,
          refused: 0,
          absent: 0,
          total: num(r.schoolTotal),
        });
      const sc = x.schools.get(s);
      sc.vaccinated += num(r.vaccinated);
      sc.refused += num(r.refused);
      sc.absent += num(r.absent);
      sc.total = Math.max(sc.total, num(r.schoolTotal));
    });
    return Array.from(m.values())
      .map((c) => ({
        ...c,
        schools: Array.from(c.schools.values()).sort(
          (a, b) => b.vaccinated - a.vaccinated
        ),
      }))
      .sort((a, b) => b.vaccinated - a.vaccinated);
  }, [filtered, filters.facility]);

  // تقسيم النوع (مدارس/سجون/أخرى)
  const typeSplit = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const t = typeOfRow(r);
      if (!m.has(t)) m.set(t, 0);
      m.set(t, m.get(t) + num(r.vaccinated));
    });
    const arr = Array.from(m.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    // ترتيب: مدارس، سجون، أخرى
    const order = { مدارس: 0, سجون: 1, أخرى: 2 };
    return arr.sort((a, b) => (order[a.name] ?? 9) - (order[b.name] ?? 9));
  }, [filtered]);

  // خيارات الشجري
  const treeData = useMemo(() => buildMindMapTree(filtered), [filtered]);
  const treeOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      tooltip: { trigger: "item" },
      series: [
        {
          type: "tree",
          data: treeData,
          top: "5%",
          left: "2%",
          bottom: "5%",
          right: "22%",
          orient: "LR",
          symbol: "circle",
          symbolSize: 8,
          edgeShape: "polyline",
          lineStyle: { width: 1, color: "#e2e8f0" },
          expandAndCollapse: true,
          initialTreeDepth: 99,
          label: { position: "right", align: "left", color: "#0f172a" },
          leaves: { label: { position: "right", align: "left" } },
          emphasis: { focus: "ancestor" },
        },
      ],
    }),
    [treeData]
  );

  // ===== الواجهة =====
  return (
    <Wrap>
      {/* فلاتر + أزرار المستشفيات */}
      <Card title="الترشيح" subtitle="اختر مستشفى أو الكل">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <div className="flex flex-col">
            <label className="text-sm">من تاريخ</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((x) => ({ ...x, from: e.target.value }))
              }
              className="border rounded-xl px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm">إلى تاريخ</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((x) => ({ ...x, to: e.target.value }))
              }
              className="border rounded-xl px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ from: "", to: "", facility: "" })}
              className="px-4 py-2 rounded-xl border w-full hover:bg-gray-50"
            >
              مسح التصفية
            </button>
          </div>
        </div>

        {/* أزرار سريعة لكل مستشفى */}
        <div className="flex gap-2 overflow-x-auto py-1">
          <button
            onClick={() => setFilters((x) => ({ ...x, facility: "" }))}
            className={`px-3 py-1 rounded-full border ${
              !filters.facility
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : "hover:bg-gray-50"
            }`}
          >
            الكل
          </button>
          {allFacilities.map((f) => (
            <button
              key={f}
              onClick={() => setFilters((x) => ({ ...x, facility: f }))}
              className={`px-3 py-1 rounded-full border ${
                filters.facility === f
                  ? "bg-sky-50 border-sky-200 text-sky-700"
                  : "hover:bg-gray-50"
              }`}
              title={f}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>

      {/* KPIs عامة */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="نسبة التغطية الإجمالية"
          subtitle="(مطعّم ÷ إجمالي الحالات)"
          pad={false}
        >
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={[{ name: "coverage", value: Math.max(0, cov) }]}
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar dataKey="value" cornerRadius={20} fill={C.emerald} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div
                  className="text-4xl font-bold"
                  style={{ color: C.emerald }}
                >
                  {cov}%
                </div>
                <div className="text-slate-500 text-sm mt-1">
                  {fmt(totals.vaccinated)} مطعّم من {fmt(denom)}
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-3 gap-3">
            <KPI
              label="نسبة الرفض"
              value={`${refusalRate}%`}
              hint={fmt(totals.refused)}
              tone="amber"
            />
            <KPI
              label="نسبة الغياب"
              value={`${absenceRate}%`}
              hint={fmt(totals.absent)}
              tone="slate"
            />
            <KPI
              label="غير مطعّم"
              value={fmt(totals.unvaccinated)}
              tone="red"
            />
          </div>
        </Card>

        <Card
          title="اتجاه التنفيذ الزمني"
          subtitle="تراكمي حسب التاريخ"
          pad={false}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={byDate}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.emerald} stopOpacity={0.6} />
                    <stop
                      offset="95%"
                      stopColor={C.emerald}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="vaccinated"
                  name="مطعّم"
                  stroke={C.emerald}
                  fill="url(#g1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="تقسيم النوع" subtitle="مدارس / سجون / أخرى" pad={false}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {["#22c55e", "#3b82f6", "#94a3b8"].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [fmt(v), n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* مقارنة المراكز حسب عدد المطعّمين */}
      <Card
        title="مقارنة المراكز حسب عدد التطعيمات"
        subtitle={
          filters.facility ? `داخل ${filters.facility}` : "جميع المستشفيات"
        }
        pad={false}
      >
        <div className="h-[420px] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={centerCompare}
              layout="vertical"
              margin={{ top: 10, right: 20, bottom: 10, left: 160 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={fmt} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={150}
              />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="vaccinated" name="مطعّم" fill={C.sky}>
                <LabelList
                  dataKey="vaccinated"
                  position="right"
                  formatter={(v) => fmt(v)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* هدف كل مستشفى = 70% من إجمالي الطلاب */}
      <Card
        title="تحقيق الهدف لكل مستشفى"
        subtitle="الهدف = 70% من إجمالي الطلاب لكل مستشفى"
        pad={false}
      >
        <div className="h-[460px] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hospitalTotals}
              layout="vertical"
              margin={{ top: 10, right: 20, bottom: 10, left: 180 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={fmt} />
              <YAxis dataKey="facility" type="category" width={170} />
              <Tooltip
                formatter={(v, n) => [fmt(v), n]}
                labelFormatter={(l) => l}
              />
              <Legend />
              {/* المتبقي نحو الهدف */}
              <Bar
                dataKey={(d) => Math.max(0, d.target - d.achieved)}
                name="المتبقي للهدف"
                stackId="t"
                fill={C.skyLight}
              />
              {/* المنجز */}
              <Bar dataKey="achieved" name="منجز" stackId="t" fill={C.sky}>
                <LabelList
                  dataKey="progressToTarget"
                  position="right"
                  formatter={(v) => `${Math.min(100, v)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* شارة صغيرة تشرح اللون حسب الإنجاز */}
        <div className="px-4 pb-4 text-sm text-slate-600">
          الألوان داخل القوائم التفصيلية تعكس التقدّم نحو الهدف:{" "}
          <span style={{ color: progressColor(100) }}>أخضر ≥ 100%</span>،
          <span style={{ color: progressColor(80) }}> أخضر فاتح ≥ 80%</span>،
          <span style={{ color: progressColor(50) }}> برتقالي 50–79%</span>،
          <span style={{ color: progressColor(10) }}> أحمر &lt; 50%</span>.
        </div>
      </Card>

      {/* شجري شامل (اختياري) */}
      <Card
        title="الخريطة الهرمية: مستشفى ← مراكز ← مدارس"
        subtitle="العقدة تعرض إجمالي المطعّمين؛ اللون يعكس جودة التغطية"
        actions={
          <button
            className="px-3 py-1 rounded-xl border"
            onClick={() => setViz("tree")}
          >
            شجري
          </button>
        }
      >
        <div className="h-[560px] rounded-2xl bg-white">
          <ReactECharts
            style={{ height: "100%", width: "100%" }}
            option={treeOption}
          />
        </div>
      </Card>

      {/* تفاصيل المستشفى المحدد: كل مركز + مدارس */}
      {filters.facility && (
        <Card
          title={`تفاصيل ${filters.facility}`}
          subtitle="كل مركز: إجمالي المطعّمين + تقدّم المدارس داخل المركز"
        >
          <div className="space-y-5">
            {centersDetail.map((c) => (
              <div key={c.center} className="rounded-xl border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{c.center}</div>
                  <div className="text-slate-600">
                    إجمالي مطعّم: {fmt(c.vaccinated)}
                  </div>
                </div>
                <div className="space-y-2">
                  {c.schools.map((s, idx) => {
                    const schoolDen =
                      s.total || s.vaccinated + s.refused + s.absent;
                    const cover = pct(s.vaccinated, schoolDen);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-60 truncate" title={s.name}>
                          {s.name}
                        </div>
                        <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-3"
                            style={{
                              width: `${Math.min(100, cover)}%`,
                              background: progressColor(cover / 0.7), // نسبة التغطية مقابل هدف 70% ≈ تقدم للهدف
                            }}
                            title={`تغطية ${cover}%`}
                          />
                        </div>
                        <div className="w-32 text-xs text-right text-slate-600">
                          مطعّم: {fmt(s.vaccinated)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {centersDetail.length === 0 && (
              <div className="text-slate-500">
                لا توجد بيانات لهذا المستشفى.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* مقارنة مطعّم/غير مطعّم (للمراجعة السريعة) */}
      <Card
        title="اتجاه مطعّم مقابل غير مطعّم"
        subtitle="للمقارنة السريعة"
        pad={false}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={byDate}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="vaccinated"
                name="مطعّم"
                stroke={C.emerald}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="unvaccinated"
                name="غير مطعّم"
                stroke={C.red}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </Wrap>
  );
}
