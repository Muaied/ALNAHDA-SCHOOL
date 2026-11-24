'use strict';
const router = require('express').Router();
const c = require('./nodes.controller');

router.get('/status', c.status);

module.exports = router;
