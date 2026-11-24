'use strict';
const service = require('./branches.service');
const asyncH = require('../../utils/asyncH');

exports.list = asyncH(async (req, res) => res.json(await service.list()));
exports.create = asyncH(async (req, res) => res.status(201).json(await service.create(req.body)));
