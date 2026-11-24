import { useEffect, useState } from 'react';
import { api } from '../api';
import { Loading, ErrorBox } from '../components';

const TABLE_LABELS = { branches: 'الفروع (كتالوج)', students: 'الطلاب', teachers: 'المعلمون', classes: 'الفصول', grades: 'الدرجات', attendance: 'الحضور' };

export default function Nodes({ notify }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = () => {
    setData(null);
    api.get('/nodes/status').then(setData).catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, []);

  if (err) return <ErrorBox msg={err} />;
  if (!data) return <Loading />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>حالة العقد</h2>
          <div className="sub">كل فرع له قاعدة MySQL مستقلة - هنا ترى اتصالها ومحتواها لحظياً</div>
        </div>
        <button className="btn btn-ghost" onClick={load}>تحديث</button>
      </div>
      <div className="nodes-grid">
        {data.nodes.map((n) => (
          <div className="node-card" key={n.key}>
            <h3>
              <span className={'status-dot ' + (n.reachable ? 'up' : 'down')}></span>
              {n.label}
            </h3>
            <div className="node-meta">{n.host}:{n.port} / {n.database}</div>
            {n.reachable ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>زمن الاستجابة: {n.latency_ms}ms</p>
                <div className="counts">
                  {Object.entries(n.counts).map(([k, v]) => (
                    <div className="cell" key={k}><b>{v}</b>{TABLE_LABELS[k] || k}</div>
                  ))}
                </div>
              </>
            ) : (
              <div className="error-box" style={{ marginBottom: 0 }}>غير متاحة: {n.error}</div>
            )}
          </div>
        ))}
      </div>
      <div className="branch-card" style={{ marginTop: 20 }}>
        <h3>توزيع الفروع على العقد</h3>
        {data.catalog.map((b) => (
          <p key={b.id} style={{ marginBottom: 6 }}><b>{b.name}</b> ({b.city}) → العقدة {b.node_key}</p>
        ))}
      </div>
    </div>
  );
}
