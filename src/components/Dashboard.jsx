// Supabase Vaccination Admin Dashboard (single-file React component)
// ---------------------------------------------------------------
// Requirements (run once):
//   npm i @supabase/supabase-js react-chartjs-2 chart.js
// Add to .env (Vite):
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
// Table assumed: daily_entries
// Columns used: school_total, not_accounted, absent, refused, vaccinated, school_name, clinic_name, facility

import React, { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { createClient } from "@supabase/supabase-js";

// --- Supabase client (single-file friendly) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- small UI bits ---
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-lg px-3 py-3 flex flex-col items-center justify-center text-center gap-1 shadow-sm border border-slate-200 h-[92px]">
      <div className="text-2xl leading-none">{icon}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-4xl font-extrabold tracking-tight text-slate-900">
        {Number.isFinite(value) ? value : "—"}
      </div>
    </div>
  );
}

function Filter({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2 text-slate-700 text-xs">
      <span className="opacity-80 w-24 truncate">{label}</span>
      <select
        className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 min-w-[160px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All">All</option>
        {options.map((o) => (
          <option key={o || "—"} value={o}>
            {o || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}

// --- helpers ---
const uniq = (arr) => Array.from(new Set(arr.filter((x) => x !== undefined && x !== null)));
const safeDiv = (a, b) => (b ? a / b : 0);
const isOther = (s) =>
  !s || ["other", "أخرى", "-", "أخري", "Other"].includes(String(s).trim().toLowerCase());

const groupSum = (rows, key) => {
  const map = new Map();
  rows.forEach((r) => {
    const k = r[key] || "—";
    const o = map.get(k) || {
      vaccinated: 0,
      refused: 0,
      absent: 0,
      not_accounted: 0,
      school_total: 0,
    };
    o.vaccinated += r.vaccinated ?? 0;
    o.refused += r.refused ?? 0;
    o.absent += r.absent ?? 0;
    o.not_accounted += r.not_accounted ?? 0;
    o.school_total += r.school_total ?? 0;
    map.set(k, o);
  });
  return Array.from(map, ([name, vals]) => ({ name, ...vals }));
};

const schoolsAgg = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    const s = r.school_name || "";
    if (isOther(s)) return;
    const o = map.get(s) || { v: 0, r: 0, a: 0, n: 0, tot: 0 };
    o.v += r.vaccinated ?? 0;
    o.r += r.refused ?? 0;
    o.a += r.absent ?? 0;
    o.n += r.not_accounted ?? 0;
    o.tot = Math.max(o.tot, r.school_total ?? 0);
    map.set(s, o);
  });
  return Array.from(map, ([school, o]) => ({
    school,
    ...o,
    covered: o.v === o.tot && o.r === 0 && o.a === 0,
    coverage: safeDiv(o.v, o.tot),
  }));
};

export default function VaccinationAdminDashboard() {
  // filters
  const [facility, setFacility] = useState("All");
  const [clinic, setClinic] = useState("All");
  const [school, setSchool] = useState("All");

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("daily_entries")
          .select(
            "school_total, not_accounted, absent, refused, vaccinated, school_name, clinic_name, facility"
          )
          .limit(100000);
        if (error) throw error;
        if (mounted) setRows(data || []);
      } catch (e) {
        console.error(e);
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Filter options (cascading) ---
  const facilities = useMemo(() => uniq(rows.map((r) => r.facility)).sort(), [rows]);

  const clinicsAll = useMemo(() => uniq(rows.map((r) => r.clinic_name)).sort(), [rows]);
  const clinicsForFacility = useMemo(() => {
    if (facility === "All") return clinicsAll;
    return uniq(rows.filter((r) => r.facility === facility).map((r) => r.clinic_name)).sort();
  }, [rows, facility, clinicsAll]);

  const schoolsAll = useMemo(() => uniq(rows.map((r) => r.school_name)).sort(), [rows]);
  const schoolsForSelection = useMemo(() => {
    let arr = rows;
    if (facility !== "All") arr = arr.filter((r) => r.facility === facility);
    if (clinic !== "All") arr = arr.filter((r) => r.clinic_name === clinic);
    return uniq(arr.map((r) => r.school_name)).sort();
  }, [rows, facility, clinic]);

  // Reset lower-level filters when parent changes
  useEffect(() => {
    setClinic((prev) => (clinicsForFacility.includes(prev) || prev === "All" ? prev : "All"));
    setSchool("All");
  }, [facility, clinicsForFacility]);

  useEffect(() => {
    setSchool((prev) => {
      const allowed = schoolsForSelection.includes(prev) || prev === "All";
      return allowed ? prev : "All";
    });
  }, [clinic, schoolsForSelection]);

  // apply filters
  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        (facility === "All" || r.facility === facility) &&
        (clinic === "All" || r.clinic_name === clinic) &&
        (school === "All" || r.school_name === school)
    );
  }, [rows, facility, clinic, school]);

  // KPIs
  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, c) => ({
          v: a.v + (c.vaccinated || 0),
          r: a.r + (c.refused || 0),
          a: a.a + (c.absent || 0),
          n: a.n + (c.not_accounted || 0),
          t: a.t + (c.school_total || 0),
        }),
        { v: 0, r: 0, a: 0, n: 0, t: 0 }
      ),
    [filtered]
  );

  const denom = totals.v + totals.r + totals.a + totals.n;

  const kpis = useMemo(
    () => ({
      total_vaccinated: totals.v,
      coverage_pct: safeDiv(totals.v, totals.t) * 100,
      refused_pct: safeDiv(totals.r, denom) * 100,
      absent_pct: safeDiv(totals.a, denom) * 100,
      not_accounted_pct: safeDiv(totals.n, denom) * 100,
      visited_schools: new Set(filtered.map((r) => r.school_name).filter((s) => !isOther(s))).size,
      fully_covered_schools: schoolsAgg(filtered).filter((s) => s.covered).length,
      facilities: new Set(filtered.map((r) => r.facility)).size,
      clinics: new Set(filtered.map((r) => r.clinic_name)).size,
    }),
    [filtered, totals, denom]
  );

  // -------- Dynamic primary chart mode --------
  // facility==All && clinic==All -> by Facility
  // facility!=All && clinic==All -> by Clinic
  // clinic!=All -> by School
  const primaryMode = clinic !== "All" ? "school" : facility !== "All" ? "clinic" : "facility";
  const primaryTitle =
    primaryMode === "facility"
      ? "Coverage by Facility"
      : primaryMode === "clinic"
      ? `Coverage by Clinic${facility !== "All" ? ` (Facility: ${facility})` : ""}`
      : `Coverage by School${clinic !== "All" ? ` (Clinic: ${clinic})` : ""}`;

  const byPrimary = useMemo(() => {
    if (primaryMode === "facility") {
      const items = groupSum(filtered, "facility").map((x) => ({
        ...x,
        coverage: safeDiv(x.vaccinated, x.school_total),
      }));
      return items.sort((a, b) => b.coverage - a.coverage);
    }
    if (primaryMode === "clinic") {
      const items = groupSum(filtered, "clinic_name").map((x) => ({
        ...x,
        coverage: safeDiv(x.vaccinated, x.school_total),
      }));
      return items.sort((a, b) => b.coverage - a.coverage);
    }
    // school mode
    const items = schoolsAgg(filtered).map((s) => ({
      name: s.school,
      vaccinated: s.v,
      school_total: s.tot,
      coverage: safeDiv(s.v, s.tot),
    }));
    return items.sort((a, b) => b.coverage - a.coverage).slice(0, 20); // limit a bit for readability
  }, [filtered, primaryMode]);

  const primaryData = useMemo(
    () => ({
      labels: byPrimary.map((x) => x.name || "—"),
      datasets: [{ label: "Coverage %", data: byPrimary.map((x) => Math.round((x.coverage || 0) * 100)) }],
    }),
    [byPrimary]
  );

  const primaryOpts = {
    indexAxis: "y",
    plugins: { title: { display: true, text: primaryTitle } },
    maintainAspectRatio: false,
    scales: { x: { ticks: { callback: (v) => `${v}%` }, suggestedMax: 100 } },
  };

  // -------- Other charts (unchanged) --------
  const byFacility = useMemo(() => {
    const items = groupSum(filtered, "facility").map((x) => ({
      ...x,
      coverage: safeDiv(x.vaccinated, x.school_total),
    }));
    return items.sort((a, b) => b.coverage - a.coverage);
  }, [filtered]);

  const stackedData = useMemo(
    () => ({
      labels: byFacility.map((x) => x.name),
      datasets: [
        { label: "Vaccinated", data: byFacility.map((x) => x.vaccinated), type: "bar", stack: "tot" },
        { label: "Refused", data: byFacility.map((x) => x.refused), type: "bar", stack: "tot" },
        { label: "Absent", data: byFacility.map((x) => x.absent), type: "bar", stack: "tot" },
        { label: "Not Accounted", data: byFacility.map((x) => x.not_accounted), type: "bar", stack: "tot" },
      ],
    }),
    [byFacility]
  );

  const stackedOpts = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: { stacked: true }, y: { stacked: true } },
    plugins: { title: { display: true, text: "Status by Facility (Stacked)" } },
  };

  const byClinic = useMemo(() => {
    const items = groupSum(filtered, "clinic_name");
    return items.sort((a, b) => b.vaccinated - a.vaccinated).slice(0, 10);
  }, [filtered]);

  const clinicData = useMemo(
    () => ({
      labels: byClinic.map((x) => x.name || "—"),
      datasets: [{ label: "Vaccinated", data: byClinic.map((x) => x.vaccinated) }],
    }),
    [byClinic]
  );

  const clinicOpts = {
    plugins: { title: { display: true, text: "Top 10 Clinics by Vaccination" } },
    maintainAspectRatio: false,
  };

  // ----- Bottom 10 Schools by Coverage (with fallback) -----
  const bottomConfig = useMemo(() => {
    const list = schoolsAgg(filtered).filter((s) => s.tot > 0);
    const withCoverage = list.filter((s) => s.tot > 0); // already filtered, but explicit
    const hasAnyCoverage = withCoverage.some((s) => s.coverage > 0 || (s.v + s.r + s.a + s.n) > 0);

    if (!hasAnyCoverage || withCoverage.length === 0) {
      // Fallback: Top 10 by Vaccinated
      const topVacc = schoolsAgg(filtered)
        .filter((s) => s.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 10);
      return {
        title: "Top 10 Schools by Vaccinated (fallback)",
        labels: topVacc.map((s) => s.school),
        values: topVacc.map((s) => s.v),
        isFallback: true,
      };
    }

    const bottom = withCoverage.sort((a, b) => a.coverage - b.coverage).slice(0, 10);
    return {
      title: "Bottom 10 Schools by Coverage",
      labels: bottom.map((s) => s.school),
      values: bottom.map((s) => Math.round((s.coverage || 0) * 100)),
      isFallback: false,
    };
  }, [filtered]);

  const bottomData = useMemo(
    () => ({
      labels: bottomConfig.labels,
      datasets: [
        {
          label: bottomConfig.isFallback ? "Vaccinated" : "Coverage %",
          data: bottomConfig.values,
        },
      ],
    }),
    [bottomConfig]
  );

  const bottomOpts = {
    indexAxis: "y",
    plugins: { title: { display: true, text: bottomConfig.title } },
    maintainAspectRatio: false,
    scales: bottomConfig.isFallback
      ? { x: { ticks: {} } }
      : { x: { ticks: { callback: (v) => `${v}%` }, suggestedMax: 100 } },
  };

  const statusData = useMemo(
    () => ({
      labels: ["Vaccinated", "Refused", "Absent", "Not Accounted"],
      datasets: [{ data: [totals.v, totals.r, totals.a, totals.n], borderWidth: 0 }],
    }),
    [totals]
  );

  const statusOpts = {
    plugins: { title: { display: true, text: "Overall Status Distribution" } },
    maintainAspectRatio: false,
    cutout: "60%",
  };

  // UI
  return (
    <div className="min-h-screen w-full bg-[#F5F7FB] text-slate-900 p-4">
      {/* Header + Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-emerald-600 text-xl">▣</span>
          <span className="font-semibold">Vaccination Admin Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Filter
            label="Facility"
            value={facility}
            onChange={(val) => {
              setFacility(val);
              setClinic("All");
              setSchool("All");
            }}
            options={facilities}
          />
          <Filter
            label="Clinic"
            value={clinic}
            onChange={(val) => {
              setClinic(val);
              setSchool("All");
            }}
            options={clinicsForFacility}
          />
          <Filter
            label="School"
            value={school}
            onChange={setSchool}
            options={schoolsForSelection}
          />
        </div>
      </div>

      {loading && <div className="mt-6 text-sm text-slate-600">Loading data from Supabase…</div>}
      {error && <div className="mt-6 text-sm text-rose-700">Error: {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-6 text-sm text-slate-500">No data for the selected filters.</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4">
        <StatCard icon="🏫" label="Visited Schools" value={kpis.visited_schools} />
        <StatCard icon="❔" label="% Not Accounted" value={Math.round(kpis.not_accounted_pct)} />
        <StatCard icon="⏳" label="% Absent" value={Math.round(kpis.absent_pct)} />
        <StatCard icon="🧍" label="% Refused" value={Math.round(kpis.refused_pct)} />
        <StatCard icon="🎯" label="% Coverage" value={Math.round(kpis.coverage_pct)} />
        <StatCard icon="💉" label="Total Vaccinated" value={kpis.total_vaccinated} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Dynamic primary chart */}
        <div className="lg:col-span-7 bg-white rounded-xl p-4 h-[260px] border border-white/10">
          <Bar data={primaryData} options={primaryOpts} />
        </div>

        <div className="lg:col-span-5 bg-white rounded-xl p-4 h-[260px] border border-white/10">
          <Doughnut data={statusData} options={statusOpts} />
        </div>

        <div className="lg:col-span-12 bg-white rounded-xl p-4 h-[320px] border border-white/10">
          <Bar data={stackedData} options={stackedOpts} />
        </div>

        <div className="lg:col-span-6 bg-white rounded-xl p-4 h-[280px] border border-white/10">
          <Bar data={clinicData} options={clinicOpts} />
        </div>

        <div className="lg:col-span-6 bg-white rounded-xl p-4 h-[280px] border border-white/10">
          <Bar data={bottomData} options={bottomOpts} />
        </div>
      </div>
    </div>
  );
}
