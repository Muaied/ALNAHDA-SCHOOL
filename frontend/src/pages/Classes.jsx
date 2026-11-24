import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../icons';
import { api } from '../api';
import { NodeBadge, Modal, Field, Loading, ErrorBox, EmptyState, NodesDownWarning } from '../components';

const LEVELS = ['الصف الأول', 'الصف الثاني', 'الصف الثالث'];

export default function Classes({ branches, notify, canWrite = true, fixedBranch = null }) {
  const [rows, setRows] = useState(null);
  const [nodesDown, setNodesDown] = useState([]);
  const [err, setErr] = useState('');
  const [branchFilter, setBranchFilter] = useState(fixedBranch || '');
  const [modal, setModal] = useState(null);
  const [teachers, setTeachers] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/classes' + (branchFilter ? '?branch_id=' + branchFilter : ''));
      setRows(data.rows);
      setNodesDown(data.nodesDown || []);
    } catch (e) { setErr(e.message); }
  }, [branchFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!modal) return;
    const bid = modal.form.branch_id;
    if (!bid) { setTeachers([]); return; }
    api.get('/teachers?branch_id=' + bid).then((d) => setTeachers(d.rows)).catch(() => setTeachers([]));
  }, [modal]);

  const save = async () => {
    const { form, mode, id } = modal;
    try {
      const body = { ...form, branch_id: Number(form.branch_id), teacher_id: form.teacher_id || null };
      if (mode === 'add') await api.post('/classes', body);
      else await api.put('/classes/' + id, body);
      notify('تم الحفظ');
      setModal(null);
      load();
    } catch (e) { notify(e.message, true); }
  };

  const remove = async (c) => {
    if (!window.confirm('حذف الفصل "' + c.name + '"؟ الطلاب يبقون لكن يفقدون ربط الفصل.')) return;
    try { await api.del('/classes/' + c.id); notify('تم الحذف'); load(); } catch (e) { notify(e.message, true); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>الفصول</h2><div className="sub">الفصول وربطها بالمعلمين داخل كل فرع</div></div>
        {canWrite && <button className="btn btn-primary" onClick={() => setModal({ mode: 'add', form: { branch_id: fixedBranch || branches[0]?.id || '', name: '', grade_level: LEVELS[0], teacher_id: '' } })}>+ إضافة فصل</button>}
      </div>
      <NodesDownWarning nodesDown={nodesDown} catalog={branches} />
      <ErrorBox msg={err} />
      <div className="toolbar">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} disabled={Boolean(fixedBranch)}>
          <option value="">كل الفروع</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <EmptyState /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>الفصل</th><th>الصف</th><th>المعلم المسؤول</th><th>عدد الطلاب</th><th>العقدة</th>{canWrite && <th>إجراءات</th>}</tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.grade_level}</td>
                  <td>{c.teacher_name || '—'}</td>
                  <td>{c.student_count}</td>
                  <td><NodeBadge node={c._node} /></td>
                  {canWrite && (
                    <td>
                      <button className="icon-btn" title="تعديل" onClick={() => setModal({ mode: 'edit', id: c.id, form: { branch_id: c.branch_id, name: c.name, grade_level: c.grade_level || LEVELS[0], teacher_id: c.teacher_id || '' } })}><Icon name="edit" /></button>
                      <button className="icon-btn" title="حذف" onClick={() => remove(c)}><Icon name="trash" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal.mode === 'add' ? 'إضافة فصل' : 'تعديل فصل'} onClose={() => setModal(null)}>
          <Field label="الفرع">
            <select value={modal.form.branch_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, branch_id: e.target.value, teacher_id: '' } })} disabled={modal.mode === 'edit' || Boolean(fixedBranch)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="اسم الفصل"><input value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} placeholder="مثال: الصف الأول (ب)" /></Field>
          <Field label="الصف">
            <select value={modal.form.grade_level} onChange={(e) => setModal({ ...modal, form: { ...modal.form, grade_level: e.target.value } })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="المعلم المسؤول (من نفس الفرع)">
            <select value={modal.form.teacher_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, teacher_id: e.target.value } })}>
              <option value="">بدون</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} - {t.subject}</option>)}
            </select>
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>حفظ</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
