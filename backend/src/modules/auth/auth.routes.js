'use strict';
const router = require('express').Router();
const c = require('./auth.controller');
const { requireAuth } = require('../../middleware/auth');
const { loginRateLimit } = require('../../middleware/rateLimit');

router.post('/login', loginRateLimit, c.login);
router.get('/me', requireAuth, c.me);

module.exports = router;
