'use strict';
const db = require('../../db/pool');

const VALID_STATUS = ['present', 'absent', 'late'];

// سجل فصل في يوم محدد: طلاب الفصل مع حالة حضورهم إن سُجلت
exports.forClass = async ({ classId, date }) => {
  if (!classId || !date) { const e = new Error('الفصل والتاريخ مطلوبان'); e.status = 400; throw e; }
  const cls = await db.locateRow('classes', classId);
  if (!cls) { const e = new Error('الفصل غير موجود'); e.status = 404; throw e; }
  const rows = await db.queryNode(
    cls.node,
    `SELECT s.id AS student_id, s.full_name, a.status
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.att_date = ?
     WHERE s.class_id = ?
     ORDER BY s.full_name`,
    [date, classId]
  );
  return { class: cls.row, date, node: cls.node, records: rows };
};

// تسجيل/تحديث حضور مجموعة طلاب دفعة واحدة على عقدة الفصل
exports.mark = async ({ class_id, date, records }) => {
  if (!class_id || !date || !Array.isArray(records)) {
    const e = new Error('الفصل والتاريخ وسجلات الطلاب مطلوبة');
    e.status = 400;
    throw e;
  }
  const cls = await db.locateRow('classes', class_id);
  if (!cls) { const e = new Error('الفصل غير موجود'); e.status = 404; throw e; }
  for (const rec of records) {
    if (!rec.student_id || !VALID_STATUS.includes(rec.status)) {
      const e = new Error('حالة الحضور غير صحيحة');
      e.status = 400;
      throw e;
    }
    await db.queryNode(
      cls.node,
      `INSERT INTO attendance (id, student_id, att_date, status) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [db.newId(), rec.student_id, date, rec.status]
    );
  }
  return { saved: records.length, node: cls.node };
};
