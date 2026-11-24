'use strict';
const bcrypt = require('bcryptjs');
const db = require('../../db/pool');
const { sign } = require('../../middleware/auth');

// البحث عن مستخدم في أول عقدة متاحة (جدول users مكرر على كل العقد)
async function findUser(username) {
  let lastErr;
  for (const node of require('../../config/env').nodes) {
    try {
      const rows = await db.queryNode(node.key, 'SELECT * FROM users WHERE username = ?', [username]);
      if (rows.length) return rows[0];
      return null;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

exports.login = async ({ username, password }) => {
  if (!username || !password) { const e = new Error('اسم المستخدم وكلمة المرور مطلوبان'); e.status = 400; throw e; }
  const user = await findUser(String(username).trim());
  if (!user) { const e = new Error('بيانات الدخول غير صحيحة'); e.status = 401; throw e; }
  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) { const e = new Error('بيانات الدخول غير صحيحة'); e.status = 401; throw e; }
  return {
    token: sign(user),
    user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, branch_id: user.branch_id },
  };
};
