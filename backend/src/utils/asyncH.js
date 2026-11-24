'use strict';
// يلتقط أخطاء الدوال غير المتزامنة ويمررها لوسيط معالجة الأخطاء
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
