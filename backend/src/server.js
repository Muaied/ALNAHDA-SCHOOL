'use strict';
const app = require('./app');
const env = require('./config/env');
const db = require('./db/pool');
const { seedIfEmpty } = require('./db/seed');

async function boot() {
  app.listen(env.port, () => {
    console.log(`الخادم يعمل الآن على: http://localhost:${env.port}`);
  });

  // ننتظر جاهزية قاعدتي البيانات (الحاويات قد تأخذ ثواني للإقلاع)
  for (let attempt = 1; attempt <= 40; attempt++) {
    try {
      await db.ensureSchema();
      console.log('قواعد البيانات جاهزة على كل العقد');
      const seeded = await seedIfEmpty();
      if (seeded) console.log('تم إدخال بيانات تجريبية وهمية في فرعي الخرطوم وعطبرة');
      return;
    } catch (err) {
      console.log(`قواعد البيانات غير جاهزة بعد (محاولة ${attempt}/40): ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.error('تعذر الاتصال بقواعد البيانات. تأكد من تشغيل MySQL ثم أعد تشغيل الخادم.');
}

boot();
