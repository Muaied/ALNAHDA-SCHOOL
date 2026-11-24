'use strict';
// ============================================================
// إعداد حسابات المستخدمين لأول مرة - شغّله محلياً على جهازك:
//   cd backend
//   ADMIN_PASSWORD='كلمة-مرور-تختارها' npm run setup:users
// كلمات المرور تُقرأ من متغيرات البيئة وتُخزن مجزأة (bcrypt)،
// ولا تُحفظ كنص صريح في أي ملف.
// لتغيير كلمة مرور حساب لاحقاً: نفس الأمر مع متغير الحساب.
// ============================================================
const bcrypt = require('bcryptjs');
const db = require('./pool');

const ACCOUNTS = [
  { username: 'admin', full_name: 'مدير المدرسة', role: 'admin', branch: null, env: 'ADMIN_PASSWORD' },
  { username: 'khartoum.manager', full_name: 'مدير فرع الخرطوم', role: 'branch_manager', branch: 1, env: 'KHARTOUM_MANAGER_PASSWORD' },
  { username: 'atbara.manager', full_name: 'مدير فرع عطبرة', role: 'branch_manager', branch: 2, env: 'ATBARA_MANAGER_PASSWORD' },
  { username: 'khartoum.registrar', full_name: 'مسؤول تسجيل الخرطوم', role: 'registrar', branch: 1, env: 'KHARTOUM_REGISTRAR_PASSWORD' },
  { username: 'atbara.registrar', full_name: 'مسؤول تسجيل عطبرة', role: 'registrar', branch: 2, env: 'ATBARA_REGISTRAR_PASSWORD' },
];

async function upsertUser(nodeKeys, account, password) {
  const hash = await bcrypt.hash(password, 10);
  for (const key of nodeKeys) {
    const existing = await db.queryNode(key, 'SELECT id FROM users WHERE username = ?', [account.username]);
    if (existing.length) {
      await db.queryNode(key, 'UPDATE users SET password_hash = ?, full_name = ?, role = ?, branch_id = ? WHERE username = ?', [hash, account.full_name, account.role, account.branch, account.username]);
    } else {
      await db.queryNode(key, 'INSERT INTO users (id, username, password_hash, full_name, role, branch_id) VALUES (?,?,?,?,?,?)', [db.newId(), account.username, hash, account.full_name, account.role, account.branch]);
    }
  }
}

(async () => {
  await db.ensureSchema();
  const env2 = require('../config/env');
  const nodeKeys = env2.nodes.map((n) => n.key);

  const requested = ACCOUNTS.filter((a) => process.env[a.env]);
  if (!requested.length) {
    console.log('لم تُمرر أي كلمة مرور. عيّن الحسابات هكذا (مثال):');
    console.log("  ADMIN_PASSWORD='اختر-كلمة-قوية' npm run setup:users");
    console.log('وللبقية: KHARTOUM_MANAGER_PASSWORD, ATBARA_MANAGER_PASSWORD, KHARTOUM_REGISTRAR_PASSWORD, ATBARA_REGISTRAR_PASSWORD');
    process.exit(1);
  }
  for (const acc of requested) {
    const pw = process.env[acc.env];
    if (pw.length < 8) { console.error(`كلمة مرور ${acc.username} قصيرة (8 أحرف على الأقل)`); process.exit(1); }
    await upsertUser(nodeKeys, acc, pw);
    console.log(`تم إعداد الحساب: ${acc.username} (${acc.full_name})`);
  }
  console.log('اكتمل الإعداد. كلمات المرور مخزنة مجزأة ولا يمكن قراءتها كنص.');
  process.exit(0);
})().catch((err) => {
  console.error('فشل الإعداد:', err.message);
  process.exit(1);
});
