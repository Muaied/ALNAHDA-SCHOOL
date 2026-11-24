'use strict';
const db = require('../../db/pool');
const fieldCrypto = require('../../utils/fieldCrypto');

const SELECT_WITH_CLASS = `
  SELECT s.*, c.name AS class_name
  FROM students s
  LEFT JOIN classes c ON c.id = s.class_id`;

const pickDefined = (src, fields) => {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
};

// قائمة الطلاب: فرع محدد = استعلام على عقدته فقط
// بدون فرع = استعلام موزع يدمج نتائج كل العقد، وكل سجل موسوم بعقدته
exports.list = async ({ branchId, q } = {}) => {
  const where = [];
  const params = [];
  if (branchId) { where.push('s.branch_id = ?'); params.push(Number(branchId)); }
  if (q) { where.push('s.full_name LIKE ?'); params.push(`%${q}%`); }
  const sql = `${SELECT_WITH_CLASS}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY s.created_at DESC`;

  if (branchId) {
    const node = await db.nodeKeyForBranch(branchId);
    const rows = await db.queryNode(node, sql, params);
    return { rows: rows.map((r) => ({ ...r, guardian_phone: fieldCrypto.decrypt(r.guardian_phone), _node: node })), nodesDown: [] };
  }

  const results = await db.queryAllNodes(sql, params);
  const rows = [];
  const nodesDown = [];
  for (const r of results) {
    if (r.error) { nodesDown.push(r.node); continue; }
    for (const row of r.rows) rows.push({ ...row, guardian_phone: fieldCrypto.decrypt(row.guardian_phone), _node: r.node });
  }
  return { rows, nodesDown };
};

exports.getById = async (id) => {
  const found = await db.locateRow('students', id);
  if (!found) { const e = new Error('الطالب غير موجود'); e.status = 404; throw e; }
  return found;
};

exports.create = async (data) => {
  const { branch_id, full_name } = data;
  if (!branch_id || !full_name) { const e = new Error('اسم الطالب والفرع مطلوبان'); e.status = 400; throw e; }
  const node = await db.nodeKeyForBranch(branch_id);
  const id = db.newId();
  await db.queryNode(
    node,
    'INSERT INTO students (id, branch_id, class_id, full_name, gender, grade_level, guardian_name, guardian_phone, status) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, branch_id, data.class_id || null, full_name, data.gender || '', data.grade_level || '', data.guardian_name || '', fieldCrypto.encrypt(data.guardian_phone || ''), data.status || 'active']
  );
  const rows = await db.queryNode(node, 'SELECT * FROM students WHERE id = ?', [id]);
  return { ...rows[0], guardian_phone: fieldCrypto.decrypt(rows[0].guardian_phone), _node: node };
};

exports.update = async (id, data) => {
  const found = await exports.getById(id);
  const fields = ['full_name', 'gender', 'grade_level', 'guardian_name', 'guardian_phone', 'status', 'class_id'];
  const changes = pickDefined(data, fields);
  if (changes.guardian_phone !== undefined) changes.guardian_phone = fieldCrypto.encrypt(changes.guardian_phone);
  const newBranch = data.branch_id !== undefined ? Number(data.branch_id) : found.row.branch_id;
  const newNode = await db.nodeKeyForBranch(newBranch);

  if (newBranch !== found.row.branch_id && newNode !== found.node) {
    // نقل طالب بين عقدتين: نسخ الطالب وسجلاته (درجات + حضور) ثم حذفه من العقدة القديمة
    const merged = { ...found.row, ...changes, branch_id: newBranch, class_id: changes.class_id !== undefined ? changes.class_id : null };
    await db.queryNode(
      newNode,
      'INSERT INTO students (id, branch_id, class_id, full_name, gender, grade_level, guardian_name, guardian_phone, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, merged.branch_id, merged.class_id, merged.full_name, merged.gender, merged.grade_level, merged.guardian_name, merged.guardian_phone, merged.status]
    );
    const grades = await db.queryNode(found.node, 'SELECT * FROM grades WHERE student_id = ?', [id]);
    for (const g of grades) {
      await db.queryNode(newNode, 'INSERT INTO grades (id, student_id, subject, term, score, max_score) VALUES (?,?,?,?,?,?)', [g.id, id, g.subject, g.term, g.score, g.max_score]);
    }
    const att = await db.queryNode(found.node, 'SELECT * FROM attendance WHERE student_id = ?', [id]);
    for (const a of att) {
      await db.queryNode(newNode, 'INSERT IGNORE INTO attendance (id, student_id, att_date, status) VALUES (?,?,?,?)', [a.id, id, a.att_date, a.status]);
    }
    await db.queryNode(found.node, 'DELETE FROM students WHERE id = ?', [id]);
    const rows = await db.queryNode(newNode, 'SELECT * FROM students WHERE id = ?', [id]);
    return { ...rows[0], guardian_phone: fieldCrypto.decrypt(rows[0].guardian_phone), _node: newNode, moved: { from: found.node, to: newNode } };
  }

  if (newBranch !== found.row.branch_id) changes.branch_id = newBranch;
  const sets = Object.keys(changes).map((f) => `${f} = ?`);
  if (sets.length) {
    await db.queryNode(found.node, `UPDATE students SET ${sets.join(', ')} WHERE id = ?`, [...Object.values(changes), id]);
  }
  const rows = await db.queryNode(found.node, 'SELECT * FROM students WHERE id = ?', [id]);
  return { ...rows[0], guardian_phone: fieldCrypto.decrypt(rows[0].guardian_phone), _node: found.node };
};

exports.remove = async (id) => {
  const found = await exports.getById(id);
  // الحذف يحذف درجاته وحضوره تلقائياً عبر ON DELETE CASCADE داخل نفس العقدة
  await db.queryNode(found.node, 'DELETE FROM students WHERE id = ?', [id]);
  return { deleted: true, node: found.node };
};
