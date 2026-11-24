import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loading, ErrorBox, EmptyState } from '../components';

export default function Attendance({ branches, notify, canWrite = true, fixedBranch = null }) {
  const today = new Date().toISOString().slice(0, 10);
  const [branchId, setBranchId] = useState(fixedBranch || '');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState(null); // [{student_id, full_name, status}]
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId) { setClasses([]); setClassId(''); setRecords(null); return; }
    api.get('/classes?branch_id=' + branchId).then((d) => { setClasses(d.rows); setClassId(''); setRecords(null); }).catch((e) => setErr(e.message));
  }, [branchId]);

  useEffect(() => {
    if (!classId || !date) { setRecords(null); return; }
    setRecords(null);
    api.get('/attendance?class_id=' + classId + '&date=' + date)
      .then((d) => setRecords(d.records.map((r) => ({ ...r, status: r.status || 'present' }))))
      .catch((e) => setErr(e.message));
  }, [classId, date]);

  const setStatus = (sid, status) => setRecords(records.map((r) => (r.student_id === sid ? { ...r, status } : r)));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post('/attendance', { class_id: classId, date, records: records.map((r) => ({ student_id: r.student_id, status: r.status })) });
      notify('تم حفظ حضور ' + res.saved + ' طالباً على العقدة ' + res.node);
    } catch (e) { notify(e.message, true); }
    setSaving(false);
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>الحضور</h2><div className="sub">تسجيل حضور فصل في يوم محدد على قاعدة بيانات فرعه</div></div>
      </div>
      <ErrorBox msg={err} />
      <div className="toolbar">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={Boolean(fixedBranch)}>
          <option value="">اختر الفرع…</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!classes.length}>
          <option value="">اختر الفصل…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {classId && records === null && <Loading />}
      {records && records.length === 0 && <EmptyState text="لا يوجد طلاب في هذا الفصل" />}
      {records && records.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الطالب</th><th>الحالة</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.student_id}>
                    <td><b>{r.full_name}</b></td>
                    <td>
                      <span className="att-toggle">
                        <button className={r.status === 'present' ? 'sel-present' : ''} onClick={() => setStatus(r.student_id, 'present')}>حاضر</button>
                        <button className={r.status === 'late' ? 'sel-late' : ''} onClick={() => setStatus(r.student_id, 'late')}>متأخر</button>
                        <button className={r.status === 'absent' ? 'sel-absent' : ''} onClick={() => setStatus(r.student_id, 'absent')}>غائب</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canWrite && <div style={{ marginTop: 16 }}><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'جار الحفظ…' : 'حفظ الحضور'}</button></div>}
        </>
      )}
    </div>
  );
}
