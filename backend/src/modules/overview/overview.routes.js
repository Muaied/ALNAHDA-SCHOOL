'use strict';
const router = require('express').Router();
const c = require('./overview.controller');

router.get('/', c.dashboard);

module.exports = router;
