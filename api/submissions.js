// src/lib/storage.js (مثال)
export async function submitDailyEntry(payload) {
    const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _upsert: 'pair', ...payload }), // أرسل hint حسب القيّد الفريد
    });

    if (!res.ok) {
        // حاول قراءة رسالة الخطأ إن وُجدت، وإلا اعطِ رسالة عامة
        let msg = 'Request failed';
        try { const j = await res.json(); msg = j?.error || msg; } catch { }
        throw new Error(msg);
    }

    // الآن فقط نقرأ الـ JSON
    return await res.json();
}
