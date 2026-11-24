'use strict';

// ============================================================
// وحدة إدارة العقد (Cluster Module)
// - تنشئ pool اتصالات لكل عقدة MySQL
// - تعرف أي فرع يعيش على أي عقدة عبر جدول الكتالوج branches
// - تنفذ "الاستعلامات الموزعة": تسأل كل العقد وتدمج النتائج
// ============================================================
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const { TABLES, DEFAULT_BRANCHES } = require('./schema');

const pools = new Map();

const FRAGMENTED_TABLES = ['students', 'teachers', 'classes', 'grades', 'attendance'];


// شهادة CA المثبتة لعقدة (CA ذاتي التوقيع مثبت مسبقاً - تحقق صريح وليس وثوقاً أعمى)
function loadPinnedCa(nodeKey) {
  const p = path.join(__dirname, '..', '..', 'certs', `ca-${nodeKey}.pem`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : undefined;
}

// mysql2 لا ينفذ checkServerIdentity، لذا نتحقق يدوياً بعد الاتصال:
// بصمة SHA-256 لشهادة الخادم يجب أن تطابق الشهادة المثبتة certs/server-<key>.pem وإلا يُرفض الاتصال (فشل مغلق)
const verifiedNodes = new Set();
async function verifyPinnedServer(nodeKey) {
  if (process.env.DB_SSL !== 'true' || verifiedNodes.has(nodeKey)) return;
  const p = path.join(__dirname, '..', '..', 'certs', `server-${nodeKey}.pem`);
  if (!fs.existsSync(p)) { verifiedNodes.add(nodeKey); return; } // لا توجد شهادة مثبتة: يُكتفى بتحقق CA
  const pinned = new crypto.X509Certificate(fs.readFileSync(p, 'utf8'));
  const node = env.nodes.find((n) => n.key === nodeKey);
  const conn = await mysql.createConnection({
    host: node.host,
    port: node.port,
    user: node.user || env.dbUser,
    password: node.password || env.dbPassword,
    database: node.database,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true, servername: node.host, ca: loadPinnedCa(nodeKey) },
  });
  try {
    const cert = conn.connection.stream.getPeerCertificate(true);
    if (!cert || !cert.fingerprint256 || cert.fingerprint256 !== pinned.fingerprint256) {
      throw new Error(`شهادة خادم قاعدة البيانات لا تطابق الشهادة المثبتة للعقدة ${nodeKey}`);
    }
    verifiedNodes.add(nodeKey);
  } finally {
    await conn.end().catch(() => {});
  }
}

function poolFor(nodeKey) {
  if (!pools.has(nodeKey)) {
    const node = env.nodes.find((n) => n.key === nodeKey);
    if (!node) throw new Error(`عقدة غير معروفة: ${nodeKey}`);
    pools.set(
      nodeKey,
      mysql.createPool({
        // TLS محقق: شهادة CA مثبتة لكل عقدة (certs/ca-<key>.pem) لمزودين بـ CA ذاتي التوقيع مثل Clever Cloud،
        // وإن غابت يتحقق من الشهادات العامة (مثل TiDB Cloud)
        ...(process.env.DB_SSL === 'true'
          ? {
              ssl: {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: true,
                servername: node.host, // SNI - لا يغني عن فحص البصمة اليدوي أدناه
                ca: loadPinnedCa(node.key),
              },
            }
          : {}),
        host: node.host,
        port: node.port,
        user: node.user || env.dbUser,
        password: node.password || env.dbPassword,
        database: node.database,
        waitForConnections: true,
        // خطط الاستضافة المجانية (مثل Clever Cloud DEV) تحد الاتصالات المتزامنة بـ 5 لكل قاعدة
        connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
        charset: 'utf8mb4',
      })
    );
  }
  return pools.get(nodeKey);
}

const newId = () => crypto.randomUUID();

// تنفيذ استعلام على عقدة واحدة محددة
async function queryNode(nodeKey, sql, params = []) {
  await verifyPinnedServer(nodeKey);
  const [rows] = await poolFor(nodeKey).query(sql, params);
  return rows;
}

// تنفيذ نفس الاستعلام على كل العقد - أساس الاستعلامات الموزعة
// العقدة المعطلة لا تُسقط النظام: تُرجع error ويكمل الباقي
async function queryAllNodes(sql, params = []) {
  const results = [];
  for (const node of env.nodes) {
    try {
      const rows = await queryNode(node.key, sql, params);
      results.push({ node: node.key, rows });
    } catch (err) {
      results.push({ node: node.key, error: err.message, rows: [] });
    }
  }
  return results;
}

// قراءة الكتالوج العام (قائمة الفروع) من أول عقدة متاحة
async function getCatalog() {
  let lastErr;
  for (const node of env.nodes) {
    try {
      return await queryNode(node.key, 'SELECT * FROM branches ORDER BY id');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

// إنشاء فرع جديد: كتابة على كل العقد بنفس المعرّف حتى يبقى الكتالوج متزامناً
async function createBranch({ name, city, node_key }) {
  if (!env.nodes.some((n) => n.key === node_key)) {
    const err = new Error('node_key غير معروف - القيم المسموحة: ' + env.nodes.map((n) => n.key).join(', '));
    err.status = 400;
    throw err;
  }
  const first = env.nodes[0].key;
  const inserted = await queryNode(first, 'INSERT INTO branches (name, city, node_key) VALUES (?, ?, ?)', [name, city || '', node_key]);
  const id = inserted.insertId;
  for (const node of env.nodes) {
    if (node.key === first) continue;
    await queryNode(node.key, 'INSERT INTO branches (id, name, city, node_key) VALUES (?, ?, ?, ?)', [id, name, city || '', node_key]);
  }
  return { id, name, city: city || '', node_key };
}

// معرفة العقدة المالكة لفرع معيّن من الكتالوج
async function nodeKeyForBranch(branchId) {
  const catalog = await getCatalog();
  const branch = catalog.find((b) => b.id === Number(branchId));
  if (!branch) {
    const err = new Error('الفرع غير موجود');
    err.status = 404;
    throw err;
  }
  return branch.node_key;
}

// البحث عن سجل عبر كل العقد (لا نعرف مسبقاً أين يعيش)
async function locateRow(table, id) {
  if (!FRAGMENTED_TABLES.includes(table)) {
    const err = new Error('جدول غير مسموح: ' + table);
    err.status = 400;
    throw err;
  }
  const results = await queryAllNodes(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  for (const r of results) {
    if (r.rows.length) return { node: r.node, row: r.rows[0] };
  }
  return null;
}

// إنشاء الجداول على كل العقد + الفروع الافتراضية عند أول تشغيل
async function ensureSchema() {
  for (const node of env.nodes) {
    for (const ddl of TABLES) {
      await queryNode(node.key, ddl);
    }
  }
  const count = await queryNode(env.nodes[0].key, 'SELECT COUNT(*) AS c FROM branches');
  if (count[0].c === 0) {
    for (const b of DEFAULT_BRANCHES) {
      await createBranch(b);
    }
  }
}

// حالة كل عقدة: الاتصال، زمن الاستجابة، عدد السجلات في كل جدول
async function nodeStatus() {
  const out = [];
  for (const node of env.nodes) {
    const started = Date.now();
    try {
      await queryNode(node.key, 'SELECT 1');
      const counts = {};
      for (const t of ['branches', ...FRAGMENTED_TABLES]) {
        const rows = await queryNode(node.key, `SELECT COUNT(*) AS c FROM ${t}`);
        counts[t] = rows[0].c;
      }
      out.push({
        key: node.key,
        label: node.label,
        host: node.host,
        port: node.port,
        database: node.database,
        reachable: true,
        latency_ms: Date.now() - started,
        counts,
      });
    } catch (err) {
      out.push({
        key: node.key,
        label: node.label,
        host: node.host,
        port: node.port,
        database: node.database,
        reachable: false,
        error: err.message,
      });
    }
  }
  return out;
}

module.exports = {
  poolFor,
  queryNode,
  queryAllNodes,
  getCatalog,
  createBranch,
  nodeKeyForBranch,
  locateRow,
  ensureSchema,
  nodeStatus,
  newId,
  FRAGMENTED_TABLES,
};
