'use strict';
const db = require('../../db/pool');

const SELECT_SQL = `
  SELECT c.*, t.full_name AS teacher_name,
    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
  FROM classes c
  LEFT JOIN teachers t ON t.id = c.teacher_id`;

exports.list = async ({ branchId } = {}) => {
  const where = branchId ? ' WHERE c.branch_id = ?' : '';
  const params = branchId ? [Number(branchId)] : [];
  const sql = `${SELECT_SQL}${where} ORDER BY c.created_at DESC`;

  if (branchId) {
    const node = await db.nodeKeyForBranch(branchId);
    const rows = await db.queryNode(node, sql, params);
    return { rows: rows.map((r) => ({ ...r, _node: node })), nodesDown: [] };
  }
  const results = await db.queryAllNodes(sql, params);
  const rows = [];
  const nodesDown = [];
  for (const r of results) {
    if (r.error) { nodesDown.push(r.node); continue; }
    for (const row of r.rows) rows.push({ ...row, _node: r.node });
  }
  return { rows, nodesDown };
};

exports.getById = async (id) => {
  const found = await db.locateRow('classes', id);
  if (!found) { const e = new Error('الفصل غير موجود'); e.status = 404; throw e; }
  return found;
};

// المعلم المسند للفصل يجب أن يكون في نفس الفرع (نفس العقدة) لأن الربط محلي
const validateTeacherSameNode = async (teacherId, branchId) => {
  if (!teacherId) return;
  const teacher = await db.locateRow('teachers', teacherId);
  if (!teacher) { const e = new Error('المعلم غير موجود'); e.status = 404; throw e; }
  if (teacher.row.branch_id !== Number(branchId)) {
    const e = new Error('المعلم المختار يتبع فرعاً آخر - اختر معلماً من نفس فرع الفصل');
    e.status = 400;
    throw e;
  }
};

exports.create = async (data) => {
  const { branch_id, name } = data;
  if (!branch_id || !name) { const e = new Error('اسم الفصل والفرع مطلوبان'); e.status = 400; throw e; }
  await validateTeacherSameNode(data.teacher_id, branch_id);
  const node = await db.nodeKeyForBranch(branch_id);
  const id = db.newId();
  await db.queryNode(
    node,
    'INSERT INTO classes (id, branch_id, name, grade_level, teacher_id) VALUES (?,?,?,?,?)',
    [id, branch_id, name, data.grade_level || '', data.teacher_id || null]
  );
  const rows = await db.queryNode(node, 'SELECT * FROM classes WHERE id = ?', [id]);
  return { ...rows[0], _node: node };
};

exports.update = async (id, data) => {
  const found = await exports.getById(id);
  if (data.branch_id !== undefined && Number(data.branch_id) !== found.row.branch_id) {
    const e = new Error('نقل الفصل بين الفروع غير مدعوم');
    e.status = 400;
    throw e;
  }
  await validateTeacherSameNode(data.teacher_id, found.row.branch_id);
  const fields = ['name', 'grade_level', 'teacher_id'];
  const sets = [];
  const params = [];
  for (const f of fields) if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
  if (sets.length) {
    params.push(id);
    await db.queryNode(found.node, `UPDATE classes SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  const rows = await db.queryNode(found.node, 'SELECT * FROM classes WHERE id = ?', [id]);
  return { ...rows[0], _node: found.node };
};

exports.remove = async (id) => {
  const found = await exports.getById(id);
  await db.queryNode(found.node, 'DELETE FROM classes WHERE id = ?', [id]);
  return { deleted: true, node: found.node };
};
