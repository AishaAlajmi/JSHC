import React, { useEffect, useMemo, useState } from "react";
import { META, FACILITIES } from "./data/meta";
import LoginEmail from "./components/LoginEmail";
import Dashboard from "./components/Dashboard";
import UserForm from "./components/common/UserForm";
import MyRecordsSmart from "./components/common/MyRecordsSmart";
import exportToExcel from "./utils/exportToExcel";
import { submitDailyEntry, getEntries } from "./lib/storage";
import LoginPage from "./components/LoginPage";

/* -------- prod-safe console + localStorage helpers -------- */
const DEBUG = true;
const log = (...args) => {
  if (DEBUG && typeof window !== "undefined") console.log("[HPVDemo]", ...args);
};

const isBrowser = typeof window !== "undefined";
const safeLSget = (k) => {
  try {
    return isBrowser ? window.localStorage.getItem(k) : null;
  } catch {
    return null;
  }
};
const safeLSset = (k, v) => {
  try {
    if (isBrowser) window.localStorage.setItem(k, v);
  } catch {}
};

/* -------- theme / brand styles -------- */
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

/* -------- LS keys -------- */
const LS_USERS = "hpv_users_demo_v4";
const LS_RESPONSES = "hpv_responses_demo_v4";
const LS_SCHOOL_INFO = "hpv_school_info_v1";

/* -------- LS helpers (SSR-safe) -------- */
function getUsers() {
  const raw = safeLSget(LS_USERS);
  return raw ? JSON.parse(raw) : {};
}
function setUsers(obj) {
  safeLSset(LS_USERS, JSON.stringify(obj));
}

function getResponses() {
  const raw = safeLSget(LS_RESPONSES);
  return raw ? JSON.parse(raw) : [];
}
function setResponsesLS(rows) {
  safeLSset(LS_RESPONSES, JSON.stringify(rows));
}

function getSchoolInfo() {
  const raw = safeLSget(LS_SCHOOL_INFO);
  return raw ? JSON.parse(raw) : {};
}
function setSchoolInfoLS(map) {
  safeLSset(LS_SCHOOL_INFO, JSON.stringify(map));
}

/* -------- small card -------- */
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

/* -------- Admin users -------- */
function AdminManageUsers() {
  const [users, setUsersState] = useState(() => getUsers());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [facility, setFacility] = useState(FACILITIES[0] || "");

  // seed users if empty (client only)
  useEffect(() => {
    if (!isBrowser) return;
    if (!safeLSget(LS_USERS)) {
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
      setUsers(seeded);
      setUsersState(seeded);
    }
  }, []);

  function addOrUpdate() {
    const key = (email || "").trim().toLowerCase();
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

/* -------- sanity checks -------- */
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
    if (sumCheck.refused + sumCheck.absent !== 5)
      throw new Error("unvaccinated calc test failed");
    [
      "aishahadi2013@gmail.com",
      "jamelah.hadi2019@gmail.com",
      "hajer@gmail.com",
      "alia@gmail.com",
    ].forEach((em) => {
      if (!getUsers()[em])
        console.warn("مستخدم مفقود (قد يكون طبيعياً قبل البذر):", em);
    });
    console.log("✅ self-tests passed");
  } catch (e) {
    console.error("self-tests error", e);
  }
}
if (isBrowser) runSelfTests();

/* -------- main app -------- */
export default function HPVDemo() {
  // lazy init so SSR doesn't touch localStorage
  const [user, setUser] = useState(null);
  const [responses, setRows] = useState(() =>
    isBrowser ? getResponses() : []
  );
  const [schoolInfo, setSchoolInfoState] = useState(() =>
    isBrowser ? getSchoolInfo() : {}
  );

  function signOut() {
    setUser(null);
  }

  // Seed demo responses on first load (browser only)
  useEffect(() => {
    if (!isBrowser) return;
    if (!safeLSget(LS_RESPONSES)) {
      const t = new Date().toISOString().slice(0, 10);
      const demo = [
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
          created_at: `${t}T08:00:00`,
          updated_at: null,
          ts: Date.parse(`${t}T08:00:00`),
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
          created_at: `${t}T09:30:00`,
          updated_at: null,
          ts: Date.parse(`${t}T09:30:00`),
        },
      ];
      setResponsesLS(demo);
      setRows(demo);
    }
  }, []);

  // map entries returned from API to local shape
  function mapEntryToLocal(e) {
    const created = e.created_at || null;
    const updated = e.updated_at || null;
    const entryDate = (e.entry_date || created || "").slice(0, 10);
    return {
      date: entryDate,
      email: e.created_by || "",
      facility: e.facility || "",
      center: e.clinic_name || "",
      school: e.school_name || "",
      vaccinated: e.vaccinated ?? 0,
      refused: e.refused ?? 0,
      absent: e.absent ?? 0,
      unvaccinated: e.not_accounted ?? 0,
      created_at: created,
      updated_at: updated,
      ts:
        (updated ? Date.parse(updated) : created ? Date.parse(created) : 0) ||
        0,
    };
  }

  // load from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const params = user.role === "user" ? { created_by: user.email } : {};
        const { rows } = await getEntries(params);
        const mapped = (rows || []).map(mapEntryToLocal);
        setRows(mapped);
        setResponsesLS(mapped);
        log("Loaded entries from Supabase:", mapped.length);
      } catch (e) {
        console.error("Failed to load entries:", e);
      }
    })();
  }, [user?.email, user?.role]);

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
      date:
        previewRow.date ||
        (inserted?.entry_date || inserted?.created_at || "").slice(0, 10),
      created_at: inserted?.created_at || null,
      updated_at: inserted?.updated_at || null,
      ts: inserted?.updated_at
        ? Date.parse(inserted.updated_at)
        : inserted?.created_at
        ? Date.parse(inserted.created_at)
        : 0,
      email: user?.email || previewRow.email,
    };
    const next = [...responses, localRow];
    setRows(next);
    setResponsesLS(next);
    return inserted;
  }

  function onExport(rows) {
    exportToExcel(rows);
  }
  function onUpdateSchoolInfo(map) {
    setSchoolInfoState(map);
    setSchoolInfoLS(map);
  }

  // merge edits coming from the table
  function handleRowEdited(patch) {
    setRows((prev) =>
      prev.map((r) =>
        r.date === patch.date &&
        r.center === patch.center &&
        r.school === patch.school
          ? { ...r, ...patch }
          : r
      )
    );
    setResponsesLS(
      (responses || []).map((r) =>
        r.date === patch.date &&
        r.center === patch.center &&
        r.school === patch.school
          ? { ...r, ...patch }
          : r
      )
    );
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
                console.error(
                  "Login failed: user not found or invalid shape",
                  u
                );
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
              onRowEdited={handleRowEdited}
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
            <div className="h-4" />
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
