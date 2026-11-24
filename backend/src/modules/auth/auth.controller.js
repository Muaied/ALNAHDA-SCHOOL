'use strict';
const service = require('./auth.service');
const asyncH = require('../../utils/asyncH');

exports.login = asyncH(async (req, res) => res.json(await service.login(req.body)));
exports.me = asyncH(async (req, res) => res.json({ id: req.user.id, username: req.user.username, full_name: req.user.full_name, role: req.user.role, branch_id: req.user.branch_id }));
