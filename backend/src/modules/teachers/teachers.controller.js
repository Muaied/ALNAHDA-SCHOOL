'use strict';
const service = require('./teachers.service');
const asyncH = require('../../utils/asyncH');
const { scopedBranch, assertBranch } = require('../../middleware/auth');

exports.list = asyncH(async (req, res) => res.json(await service.list({ branchId: scopedBranch(req, req.query.branch_id), q: req.query.q })));
exports.getById = asyncH(async (req, res) => {
  const found = await service.getById(req.params.id);
  assertBranch(req, found.row.branch_id);
  res.json(found.row);
});
exports.create = asyncH(async (req, res) => {
  assertBranch(req, req.body.branch_id);
  res.status(201).json(await service.create(req.body));
});
exports.update = asyncH(async (req, res) => {
  const found = await service.getById(req.params.id);
  assertBranch(req, found.row.branch_id);
  res.json(await service.update(req.params.id, req.body));
});
exports.remove = asyncH(async (req, res) => {
  const found = await service.getById(req.params.id);
  assertBranch(req, found.row.branch_id);
  res.json(await service.remove(req.params.id));
});
