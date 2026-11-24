'use strict';
// يولّد مفتاح تشفير جديد ويطبعه مرة واحدة - انسخه إلى ملف .env بنفسك
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('base64');
console.log('مفتاح التشفير الجديد (يظهر هنا فقط):');
console.log('');
console.log('DATA_ENCRYPTION_KEY=' + key);
console.log('');
console.log('أضف السطر أعلاه إلى backend/.env ثم أعد تشغيل الخادم.');
console.log('احتفظ بالمفتاح في مكان آمن: فقدانه يعني عدم القدرة على قراءة الحقول المشفرة.');
