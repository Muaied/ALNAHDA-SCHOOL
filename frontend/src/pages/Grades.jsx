import { useEffect, useState } from 'react';
import { Icon } from '../icons';
import { api } from '../api';
import { Loading, ErrorBox, EmptyState } from '../components';

const SUBJECTS = ['رياضيات', 'علوم', 'لغة عربية', 'لغة إنجليزية', 'حاسوب', 'دراسات اجتماعية'];

export default function Grades({ branches, notify, canWrite = true, canDelete = true, fixedBranch = null }) {
  const [branchId, setBranchId] = useState(fixedBranch || '');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [grades, setGrades] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ subject: SUBJECTS[0], term: 'الفصل الأول', score: '', max_score: 100 });

  useEffect(() => {
    if (!branchId) { setStudents([]); setStudentId(''); setGrades(null); return; }
    api.get('/students?branch_id=' + branchId).then((d) => { setStudents(d.rows); setStudentId(''); setGrades(null); }).catch((e) => setErr(e.message));
  }, [branchId]);

  useEffect(() => {
    if (!studentId) { setGrades(null); return; }
    setGrades(null);
    api.get('/grades?student_id=' + studentId).then((d) => setGrades(d.rows)).catch((e) => setErr(e.message));
  }, [studentId]);

  const add = async () => {
    try {
      await api.post('/grades', { student_id: studentId, subject: form.subject, term: form.term, score: Number(form.score), max_score: Number(form.max_score) });
      notify('تمت إضافة الدرجة');
      setForm({ ...form, score: '' });
      const d = await api.get('/grades?student_id=' + studentId);
      setGrades(d.rows);
    } catch (e) { notify(e.message, true); }
  };

  const remove = async (g) => {
    if (!window.confirm('حذف درجة ' + g.subject + '؟')) return;
    try {
      await api.del('/grades/' + g.id);
      notify('تم الحذف');
      setGrades(grades.filter((x) => x.id !== g.id));
    } catch (e) { notify(e.message, true); }
  };

  const avg = grades && grades.length ? Math.round((grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length) * 10) / 10 : null;

  return (
    <div>
      <div className="page-head">
        <div><h2>الدرجات</h2><div className="sub">اختر الفرع ثم الطالب - الدرجات تُقرأ من عقدة الطالب مباشرة</div></div>
      </div>
      <ErrorBox msg={err} />
      <div className="toolbar">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={Boolean(fixedBranch)}>
          <option value="">اختر الفرع…</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!students.length}>
          <option value="">اختر الطالب…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>

      {studentId && grades === null && <Loading />}
      {grades && (
        <>
          {avg !== null && <div className="stat-card" style={{ marginBottom: 16, maxWidth: 240 }}><div className="num">{avg}%</div><div className="lbl">متوسط الطالب</div></div>}
          {canWrite && (
            <div className="toolbar" style={{ background: '#fff', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
              <input placeholder="الفصل الدراسي" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
              <input type="number" placeholder="الدرجة" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} style={{ width: 100 }} />
              <input type="number" placeholder="العظمى" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} style={{ width: 90 }} />
              <button className="btn btn-primary" onClick={add} disabled={form.score === ''}>إضافة درجة</button>
            </div>
          )}
          {grades.length === 0 ? <EmptyState text="لا توجد درجات لهذا الطالب" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>المادة</th><th>الفصل</th><th>الدرجة</th><th>النسبة</th>{canDelete && <th></th>}</tr></thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.id}>
                      <td><b>{g.subject}</b></td>
                      <td>{g.term}</td>
                      <td>{g.score} / {g.max_score}</td>
                      <td>{Math.round((g.score / g.max_score) * 100)}%</td>
                      {canDelete && <td><button className="icon-btn" title="حذف" onClick={() => remove(g)}><Icon name="trash" /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
