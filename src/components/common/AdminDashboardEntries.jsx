
import { useEffect, useMemo, useState } from 'react';
import { getEntries } from '../lib/storage';

function sum(rows, key) { return rows.reduce((n, r) => n + (Number(r[key]) || 0), 0); }

export default function AdminDashboardEntries() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [region, setRegion] = useState('');
  const [facility, setFacility] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { const { rows: data } = await getEntries({ region, facility }); setRows(data); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [region, facility]);

  const totals = useMemo(() => ({
    vaccinated: sum(rows, 'vaccinated'),
    refused: sum(rows, 'refused'),
    absent: sum(rows, 'absent'),
    not_accounted: sum(rows, 'not_accounted'),
    school_total: sum(rows, 'school_total')
  }), [rows]);

  return (
    <div style={{ maxWidth: 1100, margin: '2rem auto', padding: 16 }}>
      <h2>لوحة المتابعة (Public)</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="المنطقة" value={region} onChange={(e)=>setRegion(e.target.value)} />
        <input placeholder="المنشأة" value={facility} onChange={(e)=>setFacility(e.target.value)} />
        <button onClick={load} disabled={loading}>{loading ? 'جارٍ التحميل…' : 'تحديث'}</button>
      </div>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div style={{ marginBottom: 12 }}>
        <strong>الإجماليات:</strong>
        <div>مطعّمين: {totals.vaccinated} | الرفض: {totals.refused} | الغياب: {totals.absent} | غير محسوب: {totals.not_accounted} | إجمالي المدرسة: {totals.school_total}</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>المنطقة</th>
              <th>المنشأة</th>
              <th>المركز</th>
              <th>المدرسة</th>
              <th>الجنس</th>
              <th>المرحلة</th>
              <th>مطعّمين</th>
              <th>الرفض</th>
              <th>الغياب</th>
              <th>غير محسوب</th>
              <th>إجمالي المدرسة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.region}</td>
                <td>{r.facility}</td>
                <td>{r.clinic_name}</td>
                <td>{r.school_name}</td>
                <td>{r.gender}</td>
                <td>{r.stage}</td>
                <td>{r.vaccinated}</td>
                <td>{r.refused}</td>
                <td>{r.absent}</td>
                <td>{r.not_accounted}</td>
                <td>{r.school_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
