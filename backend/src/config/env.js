'use strict';
require('dotenv').config();

// ============================================================
// ملف البيئة المركزي - كل الإعدادات القابلة للتغيير تُقرأ من هنا
// كل عقدة (Node) = قاعدة MySQL مستقلة تخص فرعاً واحداً من المدرسة
// ============================================================
// فشل سريع وواضح عند إعدادات ناقصة بدل العمل بقيم افتراضية غير آمنة
const JWT_PLACEHOLDERS = new Set(['', 'change-me-to-a-long-random-string', 'nahda-dev-secret-change-me']);
const jwtSecret = process.env.JWT_SECRET || '';
if (JWT_PLACEHOLDERS.has(jwtSecret)) {
  throw new Error('JWT_SECRET غير مضبوط - عيّن نصاً عشوائياً طويلاً في ملف backend/.env قبل التشغيل');
}
if (!process.env.DB_PASSWORD && !(process.env.DB_PASSWORD_A && process.env.DB_PASSWORD_B)) {
  throw new Error('كلمات مرور قواعد البيانات غير مضبوطة - عيّن DB_PASSWORD المشتركة أو DB_PASSWORD_A وDB_PASSWORD_B في backend/.env');
}

module.exports = {
  port: Number(process.env.PORT || 4000),
  schoolName: 'مدرسة النهضة',
  jwtSecret,

  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD,

  nodes: [
    {
      key: 'A',
      label: 'العقدة A - فرع الخرطوم',
      host: process.env.DB_HOST_A || 'localhost',
      port: Number(process.env.DB_PORT_A || 3307),
      database: process.env.DB_NAME_A || 'nahda_khartoum',
      user: process.env.DB_USER_A || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD_A || process.env.DB_PASSWORD,
    },
    {
      key: 'B',
      label: 'العقدة B - فرع عطبرة',
      host: process.env.DB_HOST_B || 'localhost',
      port: Number(process.env.DB_PORT_B || 3308),
      database: process.env.DB_NAME_B || 'nahda_atbara',
      user: process.env.DB_USER_B || process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD_B || process.env.DB_PASSWORD,
    },
  ],
};
