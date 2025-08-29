// =============================
// src/lib/storage.js
// Centralizes localStorage keys and helpers + demo seeding
// =============================

export const LS_USERS = "hpv_users_demo_v4";
export const LS_RESPONSES = "hpv_responses_demo_v4";
export const LS_SCHOOL_INFO = "hpv_school_info_v1";

export function seedUsers() {
    const existing = JSON.parse(localStorage.getItem(LS_USERS) || "null");
    if (existing) return existing;
    const seeded = {
        "aishahadi2013@gmail.com": { role: "user", facility: "رابغ" },
        "jamelah.hadi2019@gmail.com": { role: "user", facility: "مجمع الملك عبد الله" },
        "hajer@gmail.com": { role: "user", facility: "م. ا فهد مع المدارس العالمية" },
        "alia@gmail.com": { role: "admin", facility: null },
    };
    localStorage.setItem(LS_USERS, JSON.stringify(seeded));
    return seeded;
}

export function getUsers() {
    return JSON.parse(localStorage.getItem(LS_USERS) || "null") || seedUsers();
}

export function setUsers(obj) {
    localStorage.setItem(LS_USERS, JSON.stringify(obj));
}

export function getResponses() {
    return JSON.parse(localStorage.getItem(LS_RESPONSES) || "[]");
}

export function setResponses(rows) {
    localStorage.setItem(LS_RESPONSES, JSON.stringify(rows));
}

export function getSchoolInfo() {
    return JSON.parse(localStorage.getItem(LS_SCHOOL_INFO) || "{}");
}

export function setSchoolInfo(map) {
    localStorage.setItem(LS_SCHOOL_INFO, JSON.stringify(map));
}

// Seed demo responses once at module-load (keeps HPVDemo clean)
(function seedDemoResponses() {
    if (localStorage.getItem(LS_RESPONSES)) return;
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
})();

