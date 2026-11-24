'use strict';
// حد بسيط لمحاولات الدخول ضد التخمين عند نشر النظام علناً:
// 10 محاولات كحد أقصى كل 5 دقائق لكل (عنوان IP + اسم مستخدم).
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 60 * 1000).unref();

function loginRateLimit(req, res, next) {
  const username = (req.body && req.body.username) || '';
  const key = (req.ip || '') + '|' + String(username);
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'محاولات دخول كثيرة - انتظر خمس دقائق ثم أعد المحاولة' });
  }
  next();
}

module.exports = { loginRateLimit };
