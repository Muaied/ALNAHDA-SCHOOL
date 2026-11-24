'use strict';
const router = require('express').Router();
const c = require('./grades.controller');
const { requireRole } = require('../../middleware/auth');

router.get('/', c.list);
router.post('/', requireRole('admin', 'branch_manager', 'registrar'), c.create);
router.delete('/:id', requireRole('admin', 'branch_manager'), c.remove);

module.exports = router;
