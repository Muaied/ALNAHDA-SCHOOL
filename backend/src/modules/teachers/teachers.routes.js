'use strict';
const router = require('express').Router();
const c = require('./teachers.controller');
const { requireRole } = require('../../middleware/auth');

router.get('/', c.list);
router.get('/:id', c.getById);
router.post('/', requireRole('admin', 'branch_manager'), c.create);
router.put('/:id', requireRole('admin', 'branch_manager'), c.update);
router.delete('/:id', requireRole('admin', 'branch_manager'), c.remove);

module.exports = router;
