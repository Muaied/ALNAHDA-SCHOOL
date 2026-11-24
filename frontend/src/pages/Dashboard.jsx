import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loading, ErrorBox } from '../components';
import { Icon } from '../icons';

export default function Dashboard({ notify }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/overview').then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <ErrorBox msg={err} />;
  if (!data) return <Loading />;

  const { totals, perBranch, nodes } = data;
  const presentToday = perBranch.reduce((s, b) => s + (b.present_today || 0), 0);
  const maxStudents = Math.max(1, ...perBranch.map((b) => b.students || 0));

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>لوحة التحكم</h2>
          <div className="sub">نظرة موحدة على فرعي المدرسة من قاعدتي البيانات الموزعتين</div>
        </div>
        <button className="btn btn-ghost" onClick={() => { setData(null); api.get('/overview').then(setData).catch((e) => notify(e.message, true)); }}>تحديث</button>
      </div>

      <div className="cards">
        <div className="stat-card"><span className="icon"><Icon name="students" size={24} /></span><div className="num">{totals.students}</div><div className="lbl">إجمالي الطلاب</div></div>
        <div className="stat-card"><span className="icon"><Icon name="teachers" size={24} /></span><div className="num">{totals.teachers}</div><div className="lbl">المعلمون</div></div>
        <div className="stat-card"><span className="icon"><Icon name="classes" size={24} /></span><div className="num">{totals.classes}</div><div className="lbl">الفصول</div></div>
        <div className="stat-card"><span className="icon"><Icon name="attendance" size={24} /></span><div className="num">{presentToday}</div><div className="lbl">حاضرون اليوم</div></div>
      </div>

      {perBranch.map((b) => (
        <div className="branch-card" key={b.branch_id}>
          <h3>
            {b.branch_name}
            <span className={'node-badge node-' + b.node}>العقدة {b.node}</span>
            <span className={'status-dot ' + (b.online ? 'up' : 'down')} title={b.online ? 'متصلة' : 'معطلة'}></span>
            {!b.online && <span style={{ color: 'var(--danger)', fontSize: 13 }}>القاعدة معطلة حالياً</span>}
          </h3>
          {b.online && (
            <>
              <div className="branch-stats">
                <span><b>{b.students}</b> طالب</span>
                <span><b>{b.teachers}</b> معلم</span>
                <span><b>{b.classes}</b> فصل</span>
                <span><b>{b.avg_score_pct === null ? '—' : b.avg_score_pct + '%'}</b> متوسط الدرجات</span>
                <span><b>{b.present_today}</b> حاضرون اليوم</span>
              </div>
              <div className="progress"><div style={{ width: ((b.students || 0) / maxStudents) * 100 + '%' }}></div></div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
