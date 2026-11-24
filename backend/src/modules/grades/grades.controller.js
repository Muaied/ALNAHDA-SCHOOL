'use strict';
const service = require('./grades.service');
const db = require('../../db/pool');
const asyncH = require('../../utils/asyncH');
const { scopedBranch, assertBranch } = require('../../middleware/auth');

exports.list = asyncH(async (req, res) => {
  if (req.query.student_id) {
    const st = await db.locateRow('students', req.query.student_id);
    if (st) assertBranch(req, st.row.branch_id);
    return res.json(await service.list({ studentId: req.query.student_id }));
  }
  res.json(await service.list({ branchId: scopedBranch(req, req.query.branch_id) }));
});
exports.create = asyncH(async (req, res) => {
  const st = await db.locateRow('students', req.body.student_id);
  if (!st) { const e = new Error('الطالب غير موجود'); e.status = 404; throw e; }
  assertBranch(req, st.row.branch_id);
  res.status(201).json(await service.create(req.body));
});
exports.remove = asyncH(async (req, res) => {
  const g = await db.locateRow('grades', req.params.id);
  if (!g) { const e = new Error('الدرجة غير موجودة'); e.status = 404; throw e; }
  const st = await db.locateRow('students', g.row.student_id);
  if (st) assertBranch(req, st.row.branch_id);
  res.json(await service.remove(req.params.id));
});
