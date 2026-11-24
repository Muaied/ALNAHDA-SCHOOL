'use strict';
const service = require('./overview.service');
const asyncH = require('../../utils/asyncH');

exports.dashboard = asyncH(async (req, res) => res.json(await service.dashboard()));
