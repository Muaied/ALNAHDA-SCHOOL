'use strict';
// ============================================================
// تشفير الحقول الحساسة (AES-256-GCM)
// المفتاح يأتي من متغير البيئة DATA_ENCRYPTION_KEY (32 بايت base64)
// ولا يُحفظ في الكود. بدون مفتاح تعمل البيانات كنص عادي حتى
// يولّد المستخدم مفتاحه بـ: npm run setup:key
// القيم المشفرة تبدأ بالبادئة enc:v1: لتمييزها عن النص العادي.
// كلمات المرور لا تُشفر بهذا - تُجزأ بـ bcrypt (اتجاه واحد).
// ============================================================
const crypto = require('crypto');

const KEY_B64 = process.env.DATA_ENCRYPTION_KEY || '';
const PREFIX = 'enc:v1:';

function getKey() {
  if (!KEY_B64) return null;
  const key = Buffer.from(KEY_B64, 'base64');
  if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY يجب أن يكون 32 بايت بترميز base64');
  return key;
}

function encrypt(plain) {
  if (plain === null || plain === undefined || plain === '') return plain;
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

function decrypt(value) {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) throw new Error('بيانات مشفرة بلا مفتاح - عيّن DATA_ENCRYPTION_KEY في ملف .env');
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
