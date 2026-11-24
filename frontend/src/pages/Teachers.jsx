import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../icons';
import { api } from '../api';
import { NodeBadge, Modal, Field, Loading, ErrorBox, EmptyState, NodesDownWarning } from '../components';

const EMPTY = { branch_id: '', full_name: '', subject: '', phone: '', hire_date: '' };
const SUBJECTS = ['رياضيات', 'علوم', 'لغة عربية', 'لغة إنجليزية', 'حاسوب', 'دراسات اجتماعية'];

export default function Teachers({ branches, notify, canWrite = true, fixedBranch = null }) {
  const [rows, setRows] = useState(null);
  const [nodesDown, setNodesDown] = useState([]);
  const [err, setErr] = useState('');
  const [branchFilter, setBranchFilter] = useState(fixedBranch || '');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/teachers' + (branchFilter ? '?branch_id=' + branchFilter : ''));
      setRows(data.rows);
      setNodesDown(data.nodesDown || []);
    } catch (e) { setErr(e.message); }
  }, [branchFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const { form, mode, id } = modal;
    try {
      const body = { ...form, branch_id: Number(form.branch_id), hire_date: form.hire_date || null };
      if (mode === 'add') await api.post('/teachers', body);
      else await api.put('/teachers/' + id, body);
      notify('تم الحفظ');
      setModal(null);
      load();
    } catch (e) { notify(e.message, true); }
  };

  const remove = async (t) => {
    if (!window.confirm('حذف المعلم "' + t.full_name + '"؟')) return;
    try { await api.del('/teachers/' + t.id); notify('تم الحذف'); load(); } catch (e) { notify(e.message, true); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>المعلمون</h2><div className="sub">هيئة التدريس في الفرعين</div></div>
        {canWrite && <button className="btn btn-primary" onClick={() => setModal({ mode: 'add', form: { ...EMPTY, branch_id: fixedBranch || branches[0]?.id || '' } })}>+ إضافة معلم</button>}
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
            <thead><tr><th>الاسم</th><th>المادة</th><th>الهاتف</th><th>تاريخ التعيين</th><th>الفصول</th><th>العقدة</th>{canWrite && <th>إجراءات</th>}</tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.full_name}</b></td>
                  <td>{t.subject}</td>
                  <td style={{ direction: 'ltr' }}>{t.phone}</td>
                  <td>{t.hire_date ? String(t.hire_date).slice(0, 10) : '—'}</td>
                  <td>{t.class_count}</td>
                  <td><NodeBadge node={t._node} /></td>
                  {canWrite && (
                    <td>
                      <button className="icon-btn" title="تعديل" onClick={() => setModal({ mode: 'edit', id: t.id, form: { branch_id: t.branch_id, full_name: t.full_name, subject: t.subject || '', phone: t.phone || '', hire_date: t.hire_date ? String(t.hire_date).slice(0, 10) : '' } })}><Icon name="edit" /></button>
                      <button className="icon-btn" title="حذف" onClick={() => remove(t)}><Icon name="trash" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <Modal title={modal.mode === 'add' ? 'إضافة معلم' : 'تعديل معلم'} onClose={() => setModal(null)}>
          <Field label="الفرع">
            <select value={modal.form.branch_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, branch_id: e.target.value } })} disabled={modal.mode === 'edit' || Boolean(fixedBranch)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="الاسم الكامل"><input value={modal.form.full_name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, full_name: e.target.value } })} /></Field>
          <Field label="المادة">
            <select value={modal.form.subject} onChange={(e) => setModal({ ...modal, form: { ...modal.form, subject: e.target.value } })}>
              <option value="">اختر…</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="الهاتف"><input style={{ direction: 'ltr' }} value={modal.form.phone} onChange={(e) => setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })} /></Field>
          <Field label="تاريخ التعيين"><input type="date" value={modal.form.hire_date} onChange={(e) => setModal({ ...modal, form: { ...modal.form, hire_date: e.target.value } })} /></Field>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>حفظ</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
