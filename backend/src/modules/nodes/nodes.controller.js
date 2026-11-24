'use strict';
const db = require('../../db/pool');
const asyncH = require('../../utils/asyncH');

// حالة العقد: اتصال كل قاعدة، زمن الاستجابة، عدد السجلات، وأي فرع يعيش أين
exports.status = asyncH(async (req, res) => {
  const [nodes, catalog] = await Promise.all([db.nodeStatus(), db.getCatalog().catch(() => [])]);
  res.json({ nodes, catalog });
});
