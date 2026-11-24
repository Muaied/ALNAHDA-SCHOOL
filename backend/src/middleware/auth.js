'use strict';
// ============================================================
// المصادقة والصلاحيات
// requireAuth   : يتحقق من رمز JWT ويضيف req.user
// requireRole   : يقيد المسار بأدوار محددة
// scopedBranch  : غير المدير يرى فرعه فقط
// assertBranch  : غير المدير لا يكتب إلا في فرعه
// ============================================================
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const JWT_SECRET = process.env.JWT_SECRET || env.jwtSecret;

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, full_name: user.full_name, role: user.role, branch_id: user.branch_id },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'سجل الدخول أولاً' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'الجلسة غير صالحة - سجل الدخول من جديد' });
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'سجل الدخول أولاً' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'ليست لديك صلاحية لهذه العملية' });
  next();
};

// مدير المدرسة يرى كل الفروع؛ الباقي يُحصر في فرعه
function scopedBranch(req, requested) {
  if (req.user.role === 'admin') return requested || null;
  return String(req.user.branch_id);
}

function assertBranch(req, branchId) {
  if (req.user.role === 'admin') return;
  if (Number(branchId) !== Number(req.user.branch_id)) {
    const err = new Error('ليست لديك صلاحية على بيانات فرع آخر');
    err.status = 403;
    throw err;
  }
}

module.exports = { sign, requireAuth, requireRole, scopedBranch, assertBranch };
