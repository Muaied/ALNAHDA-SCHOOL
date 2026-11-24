import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../icons';
import { api } from '../api';
import { NodeBadge, Modal, Field, Loading, ErrorBox, EmptyState, NodesDownWarning } from '../components';

const EMPTY_FORM = { branch_id: '', full_name: '', gender: 'ذكر', grade_level: 'الصف الأول', class_id: '', guardian_name: '', guardian_phone: '' };
const LEVELS = ['الصف الأول', 'الصف الثاني', 'الصف الثالث'];

export default function Students({ branches, notify, canWrite = true, canDelete = true, fixedBranch = null }) {
  const [rows, setRows] = useState(null);
  const [nodesDown, setNodesDown] = useState([]);
  const [err, setErr] = useState('');
  const [branchFilter, setBranchFilter] = useState(fixedBranch || '');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // {mode:'add'|'edit', form, id}
  const [classes, setClasses] = useState([]);

  const load = useCallback(async () => {
    setErr('');
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set('branch_id', branchFilter);
      if (q) params.set('q', q);
      const data = await api.get('/students?' + params.toString());
      setRows(data.rows);
      setNodesDown(data.nodesDown || []);
    } catch (e) { setErr(e.message); }
  }, [branchFilter, q]);

  useEffect(() => { load(); }, [load]);

  // جلب فصول الفرع المختار في النموذج
  useEffect(() => {
    if (!modal) return;
    const bid = modal.form.branch_id;
    if (!bid) { setClasses([]); return; }
    api.get('/classes?branch_id=' + bid).then((d) => setClasses(d.rows)).catch(() => setClasses([]));
  }, [modal]);

  const openAdd = () => setModal({ mode: 'add', form: { ...EMPTY_FORM, branch_id: fixedBranch || branches[0]?.id || '' } });
  const openEdit = (s) => setModal({ mode: 'edit', id: s.id, form: { branch_id: s.branch_id, full_name: s.full_name, gender: s.gender || 'ذكر', grade_level: s.grade_level || LEVELS[0], class_id: s.class_id || '', guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '' } });

  const save = async () => {
    const { form, mode, id } = modal;
    try {
      const body = { ...form, branch_id: Number(form.branch_id), class_id: form.class_id || null };
      if (mode === 'add') await api.post('/students', body);
      else await api.put('/students/' + id, body);
      notify(mode === 'add' ? 'تمت إضافة الطالب' : 'تم تحديث بيانات الطالب');
      setModal(null);
      load();
    } catch (e) { notify(e.message, true); }
  };

  const remove = async (s) => {
    if (!window.confirm('حذف الطالب "' + s.full_name + '"؟ ستحذف درجاته وحضوره أيضاً.')) return;
    try {
      await api.del('/students/' + s.id);
      notify('تم حذف الطالب');
      load();
    } catch (e) { notify(e.message, true); }
  };

  return (
    <div>
      <div className="page-head">
        <div><h2>الطلاب</h2><div className="sub">كل سجل موسوم بالعقدة (قاعدة البيانات) التي يعيش فيها</div></div>
        {canWrite && <button className="btn btn-primary" onClick={openAdd}>+ إضافة طالب</button>}
      </div>

      <NodesDownWarning nodesDown={nodesDown} catalog={branches} />
      <ErrorBox msg={err} />

      <div className="toolbar">
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} disabled={Boolean(fixedBranch)}>
          <option value="">كل الفروع (استعلام موزع)</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name} - العقدة {b.node_key}</option>)}
        </select>
        <input placeholder="بحث بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!rows ? <Loading /> : rows.length === 0 ? <EmptyState text="لا يوجد طلاب مطابقون" /> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>الاسم</th><th>الصف</th><th>الفصل</th><th>ولي الأمر</th><th>الهاتف</th><th>العقدة</th>{canWrite && <th>إجراءات</th>}</tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.full_name}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.gender}</div></td>
                  <td>{s.grade_level}</td>
                  <td>{s.class_name || '—'}</td>
                  <td>{s.guardian_name}</td>
                  <td style={{ direction: 'ltr' }}>{s.guardian_phone}</td>
                  <td><NodeBadge node={s._node} /></td>
                  {canWrite && (
                    <td>
                      <button className="icon-btn" title="تعديل" onClick={() => openEdit(s)}><Icon name="edit" /></button>
                      {canDelete && <button className="icon-btn" title="حذف" onClick={() => remove(s)}><Icon name="trash" /></button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'إضافة طالب' : 'تعديل طالب'} onClose={() => setModal(null)}>
          <Field label="الفرع">
            <select value={modal.form.branch_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, branch_id: e.target.value, class_id: '' } })} disabled={Boolean(fixedBranch)}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="الاسم الكامل"><input value={modal.form.full_name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, full_name: e.target.value } })} /></Field>
          <Field label="النوع">
            <select value={modal.form.gender} onChange={(e) => setModal({ ...modal, form: { ...modal.form, gender: e.target.value } })}>
              <option>ذكر</option><option>أنثى</option>
            </select>
          </Field>
          <Field label="الصف">
            <select value={modal.form.grade_level} onChange={(e) => setModal({ ...modal, form: { ...modal.form, grade_level: e.target.value } })}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="الفصل (اختياري)">
            <select value={modal.form.class_id} onChange={(e) => setModal({ ...modal, form: { ...modal.form, class_id: e.target.value } })}>
              <option value="">بدون فصل</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="اسم ولي الأمر"><input value={modal.form.guardian_name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, guardian_name: e.target.value } })} /></Field>
          <Field label="هاتف ولي الأمر"><input style={{ direction: 'ltr' }} value={modal.form.guardian_phone} onChange={(e) => setModal({ ...modal, form: { ...modal.form, guardian_phone: e.target.value } })} /></Field>
          {modal.mode === 'edit' && <div className="warn-box">تغيير الفرع ينقل الطالب ودرجاته وحضوره بين قاعدتي البيانات.</div>}
          <div className="form-actions">
            <button className="btn btn-primary" onClick={save}>حفظ</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
