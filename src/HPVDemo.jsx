import React, { useEffect, useState } from "react";
import { META, FACILITIES } from "./data/meta";
import Dashboard from "./components/Dashboard";
import UserForm from "./components/common/UserForm";
import MyRecordsSmart from "./components/common/MyRecordsSmart";
import exportToExcel from "./utils/exportToExcel";
import { submitDailyEntry, getEntries } from "./lib/storage";
import LoginPage from "./components/LoginPage";

/* =================== helpers (prod/SSR safe) =================== */
const isBrowser = typeof window !== "undefined";
const safeGet = (k) => {
  try {
    return isBrowser ? window.localStorage.getItem(k) : null;
  } catch {
    return null;
  }
};
const safeSet = (k, v) => {
  try {
    if (isBrowser) window.localStorage.setItem(k, v);
  } catch {}
};
const LS_USERS = "hpv_users_demo_v4";
const LS_RESPONSES = "hpv_responses_demo_v4";
const LS_SCHOOL_INFO = "hpv_school_info_v1";

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

/* ---------- ErrorBoundary to avoid blank screen ---------- */
class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(e, i) {
    console.error("App error:", e, i);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{ padding: 20, color: "#b91c1c" }}>
          <h2>حدث خطأ غير متوقع</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#fee2e2",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HPVDemo() {
  const [user, setUser] = useState(null);
  const [responses, setResponses] = useState(() => {
    const raw = safeGet(LS_RESPONSES);
    return raw ? JSON.parse(raw) : [];
  });
  const [schoolInfo, setSchoolInfo] = useState(() => {
    const raw = safeGet(LS_SCHOOL_INFO);
    return raw ? JSON.parse(raw) : {};
  });

  // Seed demo data only in browser
  useEffect(() => {
    if (!isBrowser) return;

    if (!safeGet(LS_USERS)) {
      const seededUsers = {
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
      safeSet(LS_USERS, JSON.stringify(seededUsers));
    }

    if (!safeGet(LS_RESPONSES)) {
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
          created_at: `${t}T08:00:00Z`,
          updated_at: null,
          ts: Date.parse(`${t}T08:00:00Z`),
        },
      ];
      safeSet(LS_RESPONSES, JSON.stringify(demo));
      setResponses(demo);
    }
  }, []);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const params = user.role === "user" ? { created_by: user.email } : {};
        const res = await getEntries(params);
        const rows = Array.isArray(res?.rows) ? res.rows : [];
        const mapped = rows.map(mapEntryToLocal);
        setResponses(mapped);
        safeSet(LS_RESPONSES, JSON.stringify(mapped));
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
    const inserted = await submitDailyEntry(payload); // this is your lib; may return undefined if API is 204
    const localRow = {
      ...previewRow,
      email: user?.email || previewRow.email || "",
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
    };
    const next = [...(responses || []), localRow];
    setResponses(next);
    safeSet(LS_RESPONSES, JSON.stringify(next));
    return inserted;
  }

  function onExport(rows) {
    exportToExcel(rows || []);
  }
  function onUpdateSchoolInfo(map) {
    setSchoolInfo(map || {});
    safeSet(LS_SCHOOL_INFO, JSON.stringify(map || {}));
  }
  function handleRowEdited(patch) {
    setResponses((prev) =>
      (prev || []).map((r) =>
        r.date === patch.date &&
        r.center === patch.center &&
        r.school === patch.school
          ? { ...r, ...patch }
          : r
      )
    );
  }
  function signOut() {
    setUser(null);
  }

  const usersForLogin = (() => {
    const raw = safeGet(LS_USERS);
    return raw ? JSON.parse(raw) : {};
    // (no SSR access)
  })();

  return (
    <ErrorBoundary>
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
                    className="px-3 py-1 border rounded-xl bg白/10 text-white"
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
                const info = usersForLogin[email];
                if (info)
                  setUser({ email, role: info.role, facility: info.facility });
                else if (typeof u === "object" && u?.email && u?.role)
                  setUser(u);
                else setUser(null);
              }}
              users={usersForLogin}
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
                rows={responses || []}
                onRowEdited={handleRowEdited}
              />
            </div>
          )}

          {user && user.role === "admin" && (
            <Card title="لوحة المعلومات (قراءة فقط)">
              <Dashboard
                responses={responses || []}
                onExport={onExport}
                schoolInfo={schoolInfo}
                onUpdateSchoolInfo={onUpdateSchoolInfo}
              />
            </Card>
          )}
        </main>

        <footer className="max-w-6xl mx-auto p-4 text-center text-x text-gray-500">
          حقوق النشر محفوظة لدى{" "}
          <span className="font-bold">تجمع جدة الصحي الثاني</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
