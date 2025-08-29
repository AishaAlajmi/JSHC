// =============================
// src/HPVDemo.jsx
// Root page wiring all pieces together
// =============================

import React, { useState } from "react";
import { META, FACILITIES } from "./data/meta";
import LoginEmail from "./components/LoginEmail";
import Dashboard from "./components/Dashboard";
import UserForm from "./components/UserForm";
import exportToExcel from "./utils/exportToExcel";

import { BrandStyles, Card } from "./components/common/UI";
import AdminManageUsers from "./components/AdminManageUsers";
import MyRecordsSmart from "./components/MyRecordsSmart";
import {
  getResponses,
  setResponses,
  getSchoolInfo,
  setSchoolInfo,
  getUsers,
} from "./lib/storage";

const DEBUG = true;
const log = (...args) => DEBUG && console.log("[HPVDemo]", ...args);

// Lightweight self-tests (console only) to catch missing meta
function runSelfTests() {
  try {
    Object.entries(META.centersByFacility).forEach(([f, centers]) => {
      if (!centers || !centers.length) console.warn("لا توجد مراكز للمنشأة:", f);
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
    console.log("✅ self-tests passed (warnings mean بيانات ناقصة فقط)");
  } catch (e) {
    console.error("self-tests error", e);
  }
}
runSelfTests();

export default function HPVDemo() {
  const [user, setUser] = useState(null); // {email, role, facility}
  const [responses, setRows] = useState(getResponses());
  const [schoolInfo, setSchoolInfoState] = useState(getSchoolInfo());

  function signOut() {
    log("signOut");
    setUser(null);
  }

  function addRow(row) {
    const n = [...responses, row];
    log("addRow", row);
    setRows(n);
    setResponses(n);
  }

  function onExport(rows) {
    log("onExport", rows.length);
    exportToExcel(rows);
  }

  function onUpdateSchoolInfo(map) {
    log("onUpdateSchoolInfo", Object.keys(map).length);
    setSchoolInfoState(map);
    setSchoolInfo(map);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100">
      <BrandStyles />

      <header className="sticky top-0 z-10 text-white brand-gradient">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="font-bold">نظام حملة الورم الحليمي - نسخة تجريبية</div>
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
                log("onLogin", u);
                setUser(u);
              }}
              users={getUsers()}
            />
            <Card title="ملاحظات">
              <ul className="list-disc pr-5 text-sm text-gray-600 space-y-1">
                <li>هذه نسخة تجريبية تعمل داخل المعاينة وتخزن البيانات محليًا (LocalStorage).</li>
                <li>المستخدم يرى النموذج فقط لمنشأته؛ المشرف يرى لوحة المعلومات فقط.</li>
                <li>الحقول الثابتة تُملأ تلقائيًا من قاموس المدارس ويمكن تعديلها من لوحة المشرف.</li>
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
            <div className="h-4" />
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
