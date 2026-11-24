'use strict';
const db = require('../../db/pool');

// الفروع = الكتالوج العام، متزامن على كل العقد
exports.list = () => db.getCatalog();
exports.create = (data) => db.createBranch(data);
