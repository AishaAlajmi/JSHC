// src/components/AdminManageUsers.jsx
// Admin tool for users + facility binding + Export to Excel on Save

import React, { useState } from "react";
import { FACILITIES } from "../data/meta"; // adjust if your path differs
import { Card } from "./common/UI";
import { getUsers, setUsers } from "../lib/storage";
import exportToExcel from "../utils/exportToExcel";

const DEBUG = true;
const log = (...args) => DEBUG && console.log("[AdminManageUsers]", ...args);

function usersMapToRows(map) {
  // exportToExcel expects the responses shape with EN keys.
  const today = new Date().toISOString().slice(0, 10);
  return Object.entries(map).map(([email, v]) => ({
    date: today,
    facility: v?.role === "admin" ? "-" : v?.facility || "",
    center: "",
    school: "",
    sex: "",
    authority: "",
    stage: "",
    schoolTotal: 0,
    vaccinated: 0,
    refused: 0,
    absent: 0,
    unvaccinated: 0,
    email,
    role: v?.role || "",
  }));
}

export default function AdminManageUsers() {
  const [users, setUsersState] = useState(getUsers());
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [facility, setFacility] = useState(FACILITIES[0] || "");

  function handleSaveAndExport() {
    const key = email.trim().toLowerCase();
    let next = users;

    if (key) {
      next = { ...users, [key]: { role, facility: role === "admin" ? null : facility } };
      setUsers(next); // persist only if changed
      setUsersState(next);
      setEmail("");
      log("saved", { key, role, facility });
    } else {
      // allow exporting even without a new user
      log("export without new entry");
    }

    // Always export current table after save
    try {
      const rows = usersMapToRows(next);
      exportToExcel(rows);
      log("exported", rows.length, "rows");
    } catch (e) {
      console.error("Excel export failed", e);
    }
  }

  function removeKey(k) {
    const next = { ...users };
    delete next[k];
    log("removeKey", k);
    setUsers(next);
    setUsersState(next);
  }

  return (
    <Card
      title="صلاحيات المستخدمين"
      actions={
        <button className="btn btn-primary" onClick={handleSaveAndExport}>
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
                <td className="p-2">{v.role === "admin" ? "-" : v.facility || ""}</td>
                <td className="p-2">
                  <button className="btn btn-ghost" onClick={() => removeKey(k)}>
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
