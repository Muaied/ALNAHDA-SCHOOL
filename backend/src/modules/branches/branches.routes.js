'use strict';
const router = require('express').Router();
const c = require('./branches.controller');
const { requireRole } = require('../../middleware/auth');

router.get('/', c.list);
router.post('/', requireRole('admin'), c.create);

module.exports = router;
