'use strict';
const db = require('../../db/pool');

const SELECT_SQL = `
  SELECT g.*, s.full_name AS student_name, s.branch_id
  FROM grades g
  JOIN students s ON s.id = g.student_id`;

exports.list = async ({ studentId, branchId } = {}) => {
  const where = [];
  const params = [];
  if (studentId) { where.push('g.student_id = ?'); params.push(studentId); }
  if (branchId) { where.push('s.branch_id = ?'); params.push(Number(branchId)); }
  const sql = `${SELECT_SQL}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY g.created_at DESC`;

  // الدرجات تعيش في نفس عقدة طالبها، لذا الربط JOIN محلي دائماً
  if (studentId) {
    const student = await db.locateRow('students', studentId);
    if (!student) { const e = new Error('الطالب غير موجود'); e.status = 404; throw e; }
    const rows = await db.queryNode(student.node, sql, params);
    return { rows: rows.map((r) => ({ ...r, _node: student.node })), nodesDown: [] };
  }
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

exports.create = async (data) => {
  const { student_id, subject } = data;
  const score = Number(data.score);
  const maxScore = data.max_score !== undefined ? Number(data.max_score) : 100;
  if (!student_id || !subject) { const e = new Error('الطالب والمادة مطلوبان'); e.status = 400; throw e; }
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(maxScore) || maxScore <= 0 || score > maxScore) {
    const e = new Error('الدرجة يجب أن تكون رقماً بين صفر والدرجة العظمى');
    e.status = 400;
    throw e;
  }
  const student = await db.locateRow('students', student_id);
  if (!student) { const e = new Error('الطالب غير موجود'); e.status = 404; throw e; }
  const id = db.newId();
  await db.queryNode(
    student.node,
    'INSERT INTO grades (id, student_id, subject, term, score, max_score) VALUES (?,?,?,?,?,?)',
    [id, student_id, subject, data.term || 'الفصل الأول', score, maxScore]
  );
  const rows = await db.queryNode(student.node, 'SELECT * FROM grades WHERE id = ?', [id]);
  return { ...rows[0], _node: student.node };
};

exports.remove = async (id) => {
  const found = await db.locateRow('grades', id);
  if (!found) { const e = new Error('الدرجة غير موجودة'); e.status = 404; throw e; }
  await db.queryNode(found.node, 'DELETE FROM grades WHERE id = ?', [id]);
  return { deleted: true, node: found.node };
};
