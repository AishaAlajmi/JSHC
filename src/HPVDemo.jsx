// File: src/HPVDemo.jsx
import React, { useEffect, useMemo, useState } from "react";
import { META, FACILITIES } from "./data/meta";
import LoginEmail from "./components/LoginEmail";
import Dashboard from "./components/Dashboard";
import UserForm from "./components/common/UserForm";
import exportToExcel from "./utils/exportToExcel";
import { submitDailyEntry, getEntries } from "./lib/storage"; // ✅ single import

// ===== Debug helpers (logs only) =====
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) console.log("[HPVDemo]", ...args);
};

// ===== Brand styles (global) =====
const BrandStyles = () => (
  <style>{`
    :root{--brand:#1691D0;--brand-dark:#15508A;--brand-alt:#3AC0C3}
    *{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .brand-gradient{background:linear-gradient(135deg,var(--brand),var(--brand-dark))}
    .btn{border-radius:1rem;padding:.6rem 1rem;display:inline-flex;align-items:center;gap:.5rem}
    .btn-primary{background:var(--brand);color:#fff}
    .btn-ghost{border:1px solid #e5e7eb;background:#fff}
  `}</style>
);

// ======================
// Auth (localStorage) — email-only login
// ======================
const LS_USERS = "hpv_users_demo_v4";
const LS_RESPONSES = "hpv_responses_demo_v4";
const LS_SCHOOL_INFO = "hpv_school_info_v1";

function seedUsers() {
  const existing = JSON.parse(localStorage.getItem(LS_USERS) || "null");
  if (existing) return existing;
  const seeded = {
    "aishahadi2013@gmail.com": { role: "user", facility: "رابغ" },
    "jamelah.hadi2019@gmail.com": {
      role: "user",
      facility: "مجمع الملك عبد الله",
    },
    "hajer@gmail.com": {
      role: "user",
      facility: "م. ا فهد مع المدارس العالمية",
    },
    "alia@gmail.com": { role: "admin", facility: null },
  };
  localStorage.setItem(LS_USERS, JSON.stringify(seeded));
  return seeded;
}
function getUsers() {
  return JSON.parse(localStorage.getItem(LS_USERS) || "null") || seedUsers();
}
function setUsers(obj) {
  localStorage.setItem(LS_USERS, JSON.stringify(obj));
}

function getResponses() {
  return JSON.parse(localStorage.getItem(LS_RESPONSES) || "[]");
}
function setResponses(rows) {
  localStorage.setItem(LS_RESPONSES, JSON.stringify(rows));
}

function getSchoolInfo() {
  return JSON.parse(localStorage.getItem(LS_SCHOOL_INFO) || "{}");
}
function setSchoolInfo(map) {
  localStorage.setItem(LS_SCHOOL_INFO, JSON.stringify(map));
}

// Seed demo rows once (only for first load / offline preview)
if (!localStorage.getItem(LS_RESPONSES)) {
  const t = new Date().toISOString().slice(0, 10);
  const rows = [
    {
      date: t,
      email: "aishahadi2013@gmail.com",
      facility: "رابغ",
      center: "رابغ",
      school: "الابتدائية الاولى",
      vaccinated: 12,
      refused: 1,
      absent: 2,
      unvaccinated: 3,
      sex: "بنات",
      authority: "حكومي",
      stage: "متوسط",
      schoolTotal: 300,
    },
    {
      date: t,
      email: "jamelah.hadi2019@gmail.com",
      facility: "مجمع الملك عبد الله",
      center: "مركز صحي بريمان",
      school: "المتوسطة الثانية بعد المئة",
      vaccinated: 18,
      refused: 2,
      absent: 2,
      unvaccinated: 4,
      sex: "بنات",
      authority: "حكومي",
      stage: "متوسط",
      schoolTotal: 420,
    },
  ];
  setResponses(rows);
}

// ======================
// Small UI helpers
// ======================
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

// ======================
// Admin: emails + facility dropdown (feature #1)
// ======================
function AdminManageUsers() {
  const [users, setUsersState] = useState(getUsers());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [facility, setFacility] = useState(FACILITIES[0] || "");

  function addOrUpdate() {
    const key = email.trim().toLowerCase();
    if (!key) return;
    const next = {
      ...users,
      [key]: { role, facility: role === "admin" ? null : facility },
    };
    setUsers(next);
    setUsersState(next);
    setEmail("");
  }
  function removeKey(k) {
    const next = { ...users };
    delete next[k];
    setUsers(next);
    setUsersState(next);
  }

  return (
    <Card
      title="صلاحيات المستخدمين"
      actions={
        <button className="btn btn-primary" onClick={addOrUpdate}>
          حفظ
        </button>
      }
    >
      <div className="grid md:grid-cols-4 gap-2">
        <input
          className="border rounded-xl px-3 py-2"
          placeholder="أدخل بريدًا"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="border rounded-xl px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          className="border rounded-xl px-3 py-2"
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          disabled={role === "admin"}
        >
          {FACILITIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-auto mt-3">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-right border-b">
              <th className="p-2">البريد</th>
              <th className="p-2">الدور</th>
              <th className="p-2">المنشأة</th>
              <th className="p-2">إدارة</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(users).map(([k, v]) => (
              <tr key={k} className="border-b">
                <td className="p-2">{k}</td>
                <td className="p-2">{v.role}</td>
                <td className="p-2">
                  {v.role === "admin" ? "-" : v.facility || ""}
                </td>
                <td className="p-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => removeKey(k)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ======================
// Self-tests (console)
// ======================
function runSelfTests() {
  try {
    Object.entries(META.centersByFacility).forEach(([f, centers]) => {
      if (!centers || !centers.length)
        console.warn("لا توجد مراكز للمنشأة:", f);
    });
    Object.entries(META.centersByFacility).forEach(([f, centers]) => {
      centers.forEach((c) => {
        const k = `${f}::${c}`;
        if (!Array.isArray(META.schoolsByCenter[k]))
          console.warn("المركز بلا مدارس:", k);
      });
    });
    const sumCheck = { refused: 2, absent: 3 };
    const expectUnvac = sumCheck.refused + sumCheck.absent;
    if (expectUnvac !== 5) throw new Error("unvaccinated calc test failed");
    [
      "aishahadi2013@gmail.com",
      "jamelah.hadi2019@gmail.com",
      "hajer@gmail.com",
      "alia@gmail.com",
    ].forEach((em) => {
      if (!getUsers()[em]) console.error("مستخدم مفقود:", em);
    });
    if (!FACILITIES.includes("رابغ"))
      throw new Error("facility list missing رابغ");
    if (!META.centersByFacility["مجمع الملك عبد الله"].length)
      throw new Error("centers missing for KAMC");
    console.log(
      "✅ self-tests passed (warnings mean بيانات ناقصة في القائمة فقط)"
    );
  } catch (e) {
    console.error("self-tests error", e);
  }
}
runSelfTests();

// ======================
// My Records (filters)
// ======================
function MyRecordsSmart({ email, rows }) {
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
            onChange={(e) =>
              setFilters((x) => ({ ...x, from: e.target.value }))
            }
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
            onChange={(e) =>
              setFilters((x) => ({ ...x, sortBy: e.target.value }))
            }
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

// ======================
// Root App
// ======================
export default function HPVDemo() {
  const [user, setUser] = useState(null); // {email, role, facility}
  const [responses, setRows] = useState(getResponses());
  const [schoolInfo, setSchoolInfoState] = useState(getSchoolInfo());

  function signOut() {
    setUser(null);
  }

  // Map Supabase row → the local shape your UI uses
  function mapEntryToLocal(e) {
    return {
      date: (e.created_at || "").slice(0, 10),
      email: e.created_by || "",
      facility: e.facility || "",
      center: e.clinic_name || "",
      school: e.school_name || "",
      vaccinated: e.vaccinated ?? 0,
      refused: e.refused ?? 0,
      absent: e.absent ?? 0,
      unvaccinated: e.not_accounted ?? 0,
      sex: e.gender || "",
      authority: e.authority || "",
      stage: e.stage || "",
      schoolTotal: e.school_total ?? 0,
    };
  }

  // Load rows from Supabase when the user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const params = user.role === "user" ? { created_by: user.email } : {};
        const { rows } = await getEntries(params);
        const mapped = (rows || []).map(mapEntryToLocal);
        setRows(mapped);
        setResponses(mapped);
        log("Loaded entries from Supabase:", mapped.length);
      } catch (e) {
        console.error("Failed to load entries:", e);
      }
    })();
  }, [user?.email, user?.role]);

  // Save to Supabase, then update local list
  async function addRow(previewRow) {
    const payload = {
      facility: previewRow.facility,
      clinic_name: previewRow.center,
      school_name: previewRow.school,
      gender: previewRow.sex || "غير محدد",
      authority: previewRow.authority,
      stage: previewRow.stage,
      vaccinated: previewRow.vaccinated,
      refused: previewRow.refused,
      absent: previewRow.absent,
      not_accounted: previewRow.unvaccinated,
      school_total: previewRow.schoolTotal,
      created_by: previewRow.email || (user?.email ?? ""),
    };

    const inserted = await submitDailyEntry(payload);

    const localRow = {
      ...previewRow,
      date: previewRow.date || (inserted?.created_at || "").slice(0, 10),
    };
    const next = [...responses, localRow];
    setRows(next);
    setResponses(next);
    return inserted;
  }

  function onExport(rows) {
    exportToExcel(rows);
  }
  function onUpdateSchoolInfo(map) {
    setSchoolInfoState(map);
    setSchoolInfo(map);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <BrandStyles />
      <header className="sticky top-0 z-10 text-white brand-gradient">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="font-bold">
            نظام حملة الورم الحليمي - نسخة تجريبية
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <>
                <div className="text-sm text-right">
                  <div className="font-semibold">{user.email}</div>
                  <div className="text-gray-200">
                    {user.role === "admin" ? "مشرف" : user.facility}
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="px-3 py-1 border rounded-xl bg-white/10 text-white"
                >
                  تسجيل خروج
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {!user && (
          <>
            <LoginEmail
              onLogin={(u) => {
                setUser(u);
              }}
              users={getUsers()}
            />
            <Card title="ملاحظات">
              <ul className="list-disc pr-5 text-sm text-gray-600 space-y-1">
                <li>
                  هذه نسخة تجريبية تعمل داخل المعاينة وتخزن البيانات محليًا
                  (LocalStorage).
                </li>
                <li>
                  المستخدم يرى النموذج فقط لمنشأته؛ المشرف يرى لوحة المعلومات
                  فقط.
                </li>
                <li>
                  الحقول الثابتة تُملأ تلقائيًا من قاموس المدارس ويمكن تعديلها
                  من لوحة المشرف.
                </li>
              </ul>
            </Card>
          </>
        )}

        {user && user.role === "user" && (
          <div className="grid gap-4">
            <Card title="نموذج الإدخال اليومي">
              <UserForm
                email={user.email}
                facility={user.facility}
                meta={META}
                onSubmit={addRow}
                schoolInfo={schoolInfo}
              />
            </Card>
            <MyRecordsSmart email={user.email} rows={responses} />
          </div>
        )}

        {user && user.role === "admin" && (
          <>
            <Card title="لوحة المعلومات (قراءة فقط)">
              <Dashboard
                responses={responses}
                onExport={onExport}
                schoolInfo={schoolInfo}
                onUpdateSchoolInfo={onUpdateSchoolInfo}
              />
            </Card>
            <div className="h-4"></div>
            <AdminManageUsers />
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto p-4 text-center text-xs text-gray-500">
        © 1447–1448 | نسخة تجريبية داخل Canvas
      </footer>
    </div>
  );
}
