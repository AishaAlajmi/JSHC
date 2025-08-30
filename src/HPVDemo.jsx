// File: src/HPVDemo.jsx
import React, { useEffect, useState } from "react";
import { META, FACILITIES } from "./data/meta";
import Dashboard from "./components/Dashboard";
import UserForm from "./components/common/UserForm";
import MyRecordsSmart from "./components/common/MyRecordsSmart";
import exportToExcel from "./utils/exportToExcel";
import { submitDailyEntry, getEntries, UPSERT_MODES } from "./lib/storage";
import LoginPage from "./components/LoginPage";

const DEBUG = true;
const log = (...args) => DEBUG && console.log("[HPVDemo]", ...args);

// ---------- Brand styles ----------
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

// ---------- LocalStorage keys ----------
const LS_USERS = "hpv_users_demo_v4";
const LS_RESPONSES = "hpv_responses_demo_v4";
const LS_SCHOOL_INFO = "hpv_school_info_v1";

// ---------- Safe JSON helpers ----------
function safeParseJSON(str, fallback) {
  try {
    if (str === null || str === undefined || str === "" || str === "undefined")
      return fallback;
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
function safeSetItem(key, value, fallback) {
  try {
    localStorage.setItem(key, JSON.stringify(value ?? fallback));
  } catch {}
}

// ---------- LS helpers (guarded) ----------
function seedUsers() {
  const existing = safeParseJSON(localStorage.getItem(LS_USERS), null);
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
  safeSetItem(LS_USERS, seeded, {});
  return seeded;
}
function getUsers() {
  return safeParseJSON(localStorage.getItem(LS_USERS), null) || seedUsers();
}
function setUsers(obj) {
  safeSetItem(LS_USERS, obj, {});
}

function getResponses() {
  return safeParseJSON(localStorage.getItem(LS_RESPONSES), []);
}
function setResponses(rows) {
  safeSetItem(LS_RESPONSES, rows, []);
}

function getSchoolInfo() {
  return safeParseJSON(localStorage.getItem(LS_SCHOOL_INFO), {});
}
function setSchoolInfo(map) {
  safeSetItem(LS_SCHOOL_INFO, map, {});
}

// ---------- Seed demo once ----------
if (!localStorage.getItem(LS_RESPONSES)) {
  const t = new Date().toISOString().slice(0, 10);
  setResponses([
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
  ]);
}

// ---------- Small UI card ----------
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

// ---------- Admin user management ----------
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

// =====================================================
// Root App
// =====================================================
export default function HPVDemo() {
  const [user, setUser] = useState(null);
  const [responses, setRows] = useState(getResponses());
  const [schoolInfo, setSchoolInfoState] = useState(getSchoolInfo());

  // Clean bad LS values that could crash JSON.parse
  useEffect(() => {
    [LS_USERS, LS_RESPONSES, LS_SCHOOL_INFO].forEach((k) => {
      const v = localStorage.getItem(k);
      if (v === "undefined" || v === "") localStorage.removeItem(k);
    });
  }, []);

  function signOut() {
    setUser(null);
  }

  function mapEntryToLocal(e) {
    return {
      date: (e.entry_date || e.created_at || "").slice(0, 10),
      email: e.created_by || "",
      facility: e.facility || "",
      center: e.clinic_name || "",
      school: e.school_name || "",
      vaccinated: e.vaccinated ?? 0,
      refused: e.refused ?? 0,
      absent: e.absent ?? 0,
      unvaccinated: e.not_accounted ?? 0,
      ts: e.ts || 0,
    };
  }

  // Load from Supabase when the user logs in
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

  // --- local upsert helper to avoid duplicates in UI ---
  function upsertLocal(list, row, currentUserEmail) {
    const key = (r) => `${r.email}||${r.center}||${r.school}`;
    const targetKey = key({
      email: currentUserEmail,
      center: row.center,
      school: row.school,
    });
    const idx = list.findIndex((r) => key(r) === targetKey);
    const normalized = { ...row, email: currentUserEmail };
    if (idx >= 0) {
      const copy = [...list];
      copy[idx] = normalized; // replace existing
      return copy;
    }
    return [...list, normalized]; // add new
  }

  // Save to Supabase (upsert by pair), then update local list
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

    // server upsert by (created_by, clinic_name, school_name)
    const saved = await submitDailyEntry(payload, {
      mode: UPSERT_MODES.PER_PAIR,
    });

    // normalize date into UI row
    const localRow = {
      ...previewRow,
      date:
        previewRow.date ||
        (saved?.entry_date || saved?.created_at || "").slice(0, 10),
    };

    const next = upsertLocal(
      responses,
      localRow,
      user?.email || previewRow.email
    );
    setRows(next);
    setResponses(next);
    return saved;
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
          <div className="font-bold">نظام حملة الورم الحليمي</div>
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
          <LoginPage
            onLogin={(u) => {
              const email = (
                typeof u === "string" ? u : u?.email || ""
              ).toLowerCase();
              const info = getUsers()[email];
              if (info)
                setUser({ email, role: info.role, facility: info.facility });
              else if (typeof u === "object" && u?.email && u?.role) setUser(u);
              else {
                console.error("Login failed:", u);
                setUser(null);
              }
            }}
            users={getUsers()}
          />
        )}

        {user && user.role === "user" && (
          <div className="grid gap-4">
            <Card>
              <UserForm
                email={user.email}
                facility={user.facility}
                meta={META}
                onSubmit={addRow}
                schoolInfo={schoolInfo}
              />
            </Card>

            <MyRecordsSmart
              email={user.email}
              rows={responses}
              onExport={onExport}
            />
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
            <AdminManageUsers />
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto p-4 text-center text-x text-gray-500">
        حقوق النشر محفوظة لدى{" "}
        <span className="font-bold">تجمع جدة الصحي الثاني</span>
      </footer>
    </div>
  );
}
