import React, { useMemo, useState } from "react";
import LoginEmail from "../components/LoginEmail";

// القيود الداخلية (Gmail + القائمة البيضاء) — غير معروضة للمستخدم
const ALLOWED_EMAILS = [
  "aishahadi2013@gmail.com",
  "jamelah.hadi2019@gmail.com",
  "hajer@gmail.com",
  "alia@gmail.com",
];

function Card({ title, children, className = "" }) {
  return (
    <div className={`p-6 rounded-2xl shadow bg-white ${className}`}>
      {title && <div className="text-base font-semibold mb-3">{title}</div>}
      {children}
    </div>
  );
}

export default function LoginPage({ onLogin, users }) {
  const [error, setError] = useState("");

  // فلترة المستخدمين داخليًا فقط
  const filteredUsers = useMemo(() => {
    const out = {};
    Object.entries(users || {}).forEach(([email, info]) => {
      if (ALLOWED_EMAILS.includes(email.toLowerCase())) out[email] = info;
    });
    return out;
  }, [users]);

  function handleLogin(u) {
    const raw = typeof u === "string" ? u : u?.email;
    const email = (raw || "").trim().toLowerCase();

    const isGmail = /^[a-z0-9._%+-]+@gmail\.com$/.test(email);
    if (!isGmail) return setError("فضلاً استخدم بريد Gmail.");
    if (!ALLOWED_EMAILS.includes(email))
      return setError("تعذّر تسجيل الدخول. راجع الجهة المسؤولة لمنح الصلاحية.");

    setError("");
    onLogin(u);
  }

  return (
    <div className="space-y-6 ar-font">
      {/* استيراد الخط وتنسيق الصفحة (يؤثر فقط داخل .ar-font) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .ar-font, .ar-font * {
          font-family: "Tajawal", "Noto Kufi Arabic", "Cairo", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif !important;
        }

        .login-hero {
          position: relative;
          background: linear-gradient(135deg, var(--brand-dark), #0C5485);
          overflow: hidden;
          border-radius: 1rem;
        }
        .login-hero::after {
          content: ""; position: absolute; inset: -20%;
          background:
            radial-gradient(600px 200px at 85% -20%, #ffffff2e, transparent 60%),
            radial-gradient(500px 160px at 10% 120%, #3AC0C345, transparent 60%);
          pointer-events: none;
        }

        /* حقول وأزرار تسجيل الدخول */
        .login-card input[type="email"], .login-card input[type="text"] {
          border-radius: 0.875rem; padding: .75rem 1rem; border: 1px solid #e5e7eb;
        }
        .login-card input:focus {
          outline: none; border-color: var(--brand);
          box-shadow: 0 0 0 3px #3AC0C326;
        }
        .login-card button {
          border-radius: 1rem; padding: .7rem 1.15rem;
          background: var(--brand);       /* اللون الأساسي */
          color: #fff;
          transition: background .18s ease, box-shadow .18s ease;
          box-shadow: 0 6px 16px rgba(22,145,208,.25);
        }
        .login-card button:hover {
          background: #0e6fa7;            /* لون هوفر جديد أغمق ومريح */
          box-shadow: 0 8px 18px rgba(18,111,167,.28);
        }
        .login-card button:active {
          background: var(--brand-dark);  /* عند الضغط */
          box-shadow: 0 4px 12px rgba(18,111,167,.22);
        }
        .login-card button:focus-visible {
          outline: 3px solid #3AC0C380; outline-offset: 2px;
        }
      `}</style>

      {/* الهيدر مع شعار أكبر */}
      <header className="login-hero text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <img
              src="/assets/cluster-logo.png"
              alt="تجمع جدة الصحي الثاني"
              className="h-24 md:h-28 lg:h-32 w-auto object-contain"  /* شعار أكبر */
            />
            <div className="leading-tight">
              <div className="text-2xl md:text-3xl font-extrabold">
                تجمع جدة الصحي الثاني
              </div>
              <div className="text-xs md:text-sm text-white/90">
                Jeddah Second Health Cluster
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* شبكة متجاوبة */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="login-card">
          <div className="mb-4">
            <h1 className="text-lg font-semibold">تسجيل الدخول</h1>
            <p className="text-sm text-gray-600">أدخل بريدك على Gmail للمتابعة.</p>
          </div>

          <LoginEmail onLogin={handleLogin} users={filteredUsers} />

          {error ? (
            <div
              className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl"
              role="alert" aria-live="polite"
            >
              {error}
            </div>
          ) : null}
        </Card>

        <Card title="إرشادات">
          <ul className="list-disc pr-5 text-sm text-gray-600 space-y-1">
            <li>هذا النظام مخصص للأعضاء المخوّلين فقط.</li>
            <li>في حال واجهت مشكلة، تواصل مع الدعم الفني.</li>
            <li>احرص على الحفاظ على سرية بيانات الدخول.</li>
          </ul>
        </Card>
      </div>
    </div>

  );
  
}
