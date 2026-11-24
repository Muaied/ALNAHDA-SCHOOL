'use strict';
const db = require('../../db/pool');

const SELECT_SQL = `
  SELECT t.*, (SELECT COUNT(*) FROM classes c WHERE c.teacher_id = t.id) AS class_count
  FROM teachers t`;

exports.list = async ({ branchId, q } = {}) => {
  const where = [];
  const params = [];
  if (branchId) { where.push('t.branch_id = ?'); params.push(Number(branchId)); }
  if (q) { where.push('t.full_name LIKE ?'); params.push(`%${q}%`); }
  const sql = `${SELECT_SQL}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY t.created_at DESC`;

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
  const found = await db.locateRow('teachers', id);
  if (!found) { const e = new Error('المعلم غير موجود'); e.status = 404; throw e; }
  return found;
};

exports.create = async (data) => {
  const { branch_id, full_name } = data;
  if (!branch_id || !full_name) { const e = new Error('اسم المعلم والفرع مطلوبان'); e.status = 400; throw e; }
  const node = await db.nodeKeyForBranch(branch_id);
  const id = db.newId();
  await db.queryNode(
    node,
    'INSERT INTO teachers (id, branch_id, full_name, subject, phone, hire_date) VALUES (?,?,?,?,?,?)',
    [id, branch_id, full_name, data.subject || '', data.phone || '', data.hire_date || null]
  );
  const rows = await db.queryNode(node, 'SELECT * FROM teachers WHERE id = ?', [id]);
  return { ...rows[0], _node: node };
};

exports.update = async (id, data) => {
  const found = await exports.getById(id);
  if (data.branch_id !== undefined && Number(data.branch_id) !== found.row.branch_id) {
    const e = new Error('نقل المعلم بين الفروع غير مدعوم - احذف السجل وأعد إنشاءه في الفرع الجديد');
    e.status = 400;
    throw e;
  }
  const fields = ['full_name', 'subject', 'phone', 'hire_date'];
  const sets = [];
  const params = [];
  for (const f of fields) if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
  if (sets.length) {
    params.push(id);
    await db.queryNode(found.node, `UPDATE teachers SET ${sets.join(', ')} WHERE id = ?`, params);
  }
  const rows = await db.queryNode(found.node, 'SELECT * FROM teachers WHERE id = ?', [id]);
  return { ...rows[0], _node: found.node };
};

exports.remove = async (id) => {
  const found = await exports.getById(id);
  await db.queryNode(found.node, 'DELETE FROM teachers WHERE id = ?', [id]);
  return { deleted: true, node: found.node };
};
