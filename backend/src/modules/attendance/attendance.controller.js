'use strict';
const service = require('./attendance.service');
const db = require('../../db/pool');
const asyncH = require('../../utils/asyncH');
const { assertBranch } = require('../../middleware/auth');

exports.forClass = asyncH(async (req, res) => {
  const cls = await db.locateRow('classes', req.query.class_id);
  if (cls) assertBranch(req, cls.row.branch_id);
  res.json(await service.forClass({ classId: req.query.class_id, date: req.query.date }));
});
exports.mark = asyncH(async (req, res) => {
  const cls = await db.locateRow('classes', req.body.class_id);
  if (!cls) { const e = new Error('الفصل غير موجود'); e.status = 404; throw e; }
  assertBranch(req, cls.row.branch_id);
  res.json(await service.mark(req.body));
});
