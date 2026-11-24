'use strict';
const db = require('../../db/pool');

// لوحة تحكم مجمعة من كل العقد + إحصائيات لكل فرع من عقدته
exports.dashboard = async () => {
  const branches = await db.getCatalog();
  const nodes = await db.nodeStatus();
  const upNodes = Object.fromEntries(nodes.filter((n) => n.reachable).map((n) => [n.key, n]));

  const totals = { students: 0, teachers: 0, classes: 0, grades: 0 };
  const perBranch = [];

  for (const branch of branches) {
    const node = upNodes[branch.node_key];
    const info = { branch_id: branch.id, branch_name: branch.name, city: branch.city, node: branch.node_key, online: Boolean(node) };
    if (node) {
      const s = await db.queryNode(branch.node_key, 'SELECT COUNT(*) AS c FROM students WHERE branch_id = ?', [branch.id]);
      const t = await db.queryNode(branch.node_key, 'SELECT COUNT(*) AS c FROM teachers WHERE branch_id = ?', [branch.id]);
      const c = await db.queryNode(branch.node_key, 'SELECT COUNT(*) AS c FROM classes WHERE branch_id = ?', [branch.id]);
      const avg = await db.queryNode(
        branch.node_key,
        'SELECT AVG(g.score / g.max_score * 100) AS p FROM grades g JOIN students s ON s.id = g.student_id WHERE s.branch_id = ?',
        [branch.id]
      );
      const presentToday = await db.queryNode(
        branch.node_key,
        `SELECT COUNT(*) AS c FROM attendance a JOIN students s ON s.id = a.student_id
         WHERE s.branch_id = ? AND a.att_date = CURDATE() AND a.status = 'present'`,
        [branch.id]
      );
      info.students = s[0].c;
      info.teachers = t[0].c;
      info.classes = c[0].c;
      info.avg_score_pct = avg[0].p ? Math.round(avg[0].p * 10) / 10 : null;
      info.present_today = presentToday[0].c;
      totals.students += info.students;
      totals.teachers += info.teachers;
      totals.classes += info.classes;
    }
    perBranch.push(info);
  }

  for (const n of Object.values(upNodes)) totals.grades += n.counts.grades || 0;

  return { totals, perBranch, nodes };
};
