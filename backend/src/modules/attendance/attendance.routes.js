'use strict';
const router = require('express').Router();
const c = require('./attendance.controller');
const { requireRole } = require('../../middleware/auth');

router.get('/', c.forClass);
router.post('/', requireRole('admin', 'branch_manager', 'registrar'), c.mark);

module.exports = router;
