'use strict';
// بيانات تجريبية وهمية بالكامل - لا تمثل أي أشخاص حقيقيين
const db = require('./pool');

const MALE = ['أحمد', 'محمد', 'عمر', 'مصطفى', 'خالد', 'يوسف', 'إبراهيم', 'عبد الله', 'طه', 'الطيب', 'معاوية', 'الفاتح'];
const FEMALE = ['فاطمة', 'مريم', 'خديجة', 'آمنة', 'سارة', 'هبة', 'إيمان', 'رقية', 'سلمى', 'زينب', 'نورة', 'حفصة'];
const LAST = ['الحسن', 'عبد الرحمن', 'إدريس', 'النور', 'عثمان', 'الزين', 'بابكر', 'الصادق', 'الماحي', 'التجاني', 'حماد', 'الكباشي'];
const SUBJECTS = ['رياضيات', 'علوم', 'لغة عربية', 'لغة إنجليزية', 'حاسوب', 'دراسات اجتماعية'];
const LEVELS = ['الصف الأول', 'الصف الثاني', 'الصف الثالث'];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPhone = () => '09' + String(randInt(10000000, 99999999));
const randomDate = (from, to) => {
  const start = new Date(from, 0, 1).getTime();
  const end = new Date(to, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
};

async function seedBranch(branch) {
  const node = branch.node_key;

  // معلمون - واحد لكل مادة
  const teacherIds = [];
  for (let i = 0; i < SUBJECTS.length; i++) {
    const id = db.newId();
    const female = i % 2 === 1;
    const name = (female ? 'أستاذة ' : 'أستاذ ') + pick(female ? FEMALE : MALE) + ' ' + pick(LAST);
    await db.queryNode(node, 'INSERT INTO teachers (id, branch_id, full_name, subject, phone, hire_date) VALUES (?,?,?,?,?,?)', [id, branch.id, name, SUBJECTS[i], randomPhone(), randomDate(2015, 2023)]);
    teacherIds.push(id);
  }

  // فصول - شعبة لكل صف
  const classList = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const id = db.newId();
    await db.queryNode(node, 'INSERT INTO classes (id, branch_id, name, grade_level, teacher_id) VALUES (?,?,?,?,?)', [id, branch.id, `${LEVELS[i]} (أ)`, LEVELS[i], teacherIds[i]]);
    classList.push({ id, level: LEVELS[i] });
  }

  // طلاب - 12 طالباً وهمياً في كل فرع
  const studentIds = [];
  for (let i = 0; i < 12; i++) {
    const id = db.newId();
    const female = i % 2 === 1;
    const name = pick(female ? FEMALE : MALE) + ' ' + pick(LAST) + ' ' + pick(LAST);
    const cls = classList[i % classList.length];
    await db.queryNode(
      node,
      'INSERT INTO students (id, branch_id, class_id, full_name, gender, grade_level, guardian_name, guardian_phone, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [id, branch.id, cls.id, name, female ? 'أنثى' : 'ذكر', cls.level, 'ولي أمر ' + pick(MALE) + ' ' + pick(LAST), randomPhone(), 'active']
    );
    studentIds.push(id);
  }

  // درجات - 4 مواد لكل طالب
  for (const sid of studentIds) {
    for (const subject of SUBJECTS.slice(0, 4)) {
      await db.queryNode(node, 'INSERT INTO grades (id, student_id, subject, term, score, max_score) VALUES (?,?,?,?,?,?)', [db.newId(), sid, subject, 'الفصل الأول', randInt(42, 100), 100]);
    }
  }

  // حضور آخر 5 أيام
  for (let d = 5; d >= 1; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const ds = date.toISOString().slice(0, 10);
    for (const sid of studentIds) {
      const r = Math.random();
      const status = r < 0.85 ? 'present' : r < 0.95 ? 'late' : 'absent';
      await db.queryNode(node, 'INSERT IGNORE INTO attendance (id, student_id, att_date, status) VALUES (?,?,?,?)', [db.newId(), sid, ds, status]);
    }
  }
}

async function seedIfEmpty() {
  const catalog = await db.getCatalog();
  let hasStudents = false;
  for (const branch of catalog) {
    try {
      const c = await db.queryNode(branch.node_key, 'SELECT COUNT(*) AS c FROM students');
      if (c[0].c > 0) hasStudents = true;
    } catch (e) { /* عقدة معطلة - نتجاوزها */ }
  }
  if (hasStudents) return false;
  for (const branch of catalog) {
    try {
      await seedBranch(branch);
    } catch (e) {
      console.error(`تعذر إدخال البيانات التجريبية في ${branch.name}: ${e.message}`);
    }
  }
  return true;
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  (async () => {
    await db.ensureSchema();
    const seeded = await seedIfEmpty();
    console.log(seeded ? 'تم إدخال البيانات التجريبية الوهمية بنجاح' : 'البيانات موجودة مسبقاً - لم يتغير شيء');
    process.exit(0);
  })().catch((err) => {
    console.error('فشل الإدخال التجريبي:', err.message);
    process.exit(1);
  });
}
