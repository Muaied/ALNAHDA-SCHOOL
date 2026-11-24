'use strict';
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
// خلف وسيط الاستضافة (مثل Render) حتى يكون req.ip صحيحاً لحد المحاولات
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./modules/auth/auth.routes'));
app.get('/api/health', (req, res) => res.json({ ok: true, app: 'مدرسة النهضة - نظام الإدارة الموزع', time: new Date().toISOString() }));

// كل المسارات التالية محمية برمز الدخول
app.use('/api', require('./middleware/auth').requireAuth);

app.use('/api/branches', require('./modules/branches/branches.routes'));
app.use('/api/students', require('./modules/students/students.routes'));
app.use('/api/teachers', require('./modules/teachers/teachers.routes'));
app.use('/api/classes', require('./modules/classes/classes.routes'));
app.use('/api/grades', require('./modules/grades/grades.routes'));
app.use('/api/attendance', require('./modules/attendance/attendance.routes'));
app.use('/api/overview', require('./modules/overview/overview.routes'));
app.use('/api/nodes', require('./modules/nodes/nodes.routes'));

// الواجهة الأمامية المبنية (React build)
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(dist));

app.use('/api', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err && !res.headersSent) {
      res.type('text').send('الواجهة الأمامية غير مبنية بعد. نفّذ: cd frontend && npm install && npm run build');
    }
  });
});

// معالج الأخطاء الموحد: يرجع رسالة عربية واضحة
app.use((err, req, res, next) => {
  const dbDown = err.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(String(err.code));
  const isDbError = err.code && String(err.code).startsWith('ER_');
  if (dbDown) return res.status(503).json({ error: 'قاعدة البيانات غير متاحة حالياً - تأكد من تشغيل MySQL (راجع README)' });
  const status = err.status || (isDbError ? 503 : 500);
  res.status(status).json({ error: err.message || 'خطأ غير متوقع' });
});

module.exports = app;
