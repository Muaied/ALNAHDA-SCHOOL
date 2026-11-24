// مكونات مشتركة
import { Icon } from './icons';
export function NodeBadge({ node }) {
  return <span className={'node-badge node-' + node}>العقدة {node}</span>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق"><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Loading() {
  return <div className="loading">جار التحميل…</div>;
}

export function ErrorBox({ msg }) {
  if (!msg) return null;
  return <div className="error-box">{msg}</div>;
}

export function EmptyState({ text }) {
  return <div className="empty-state">{text || 'لا توجد بيانات بعد'}</div>;
}

export function NodesDownWarning({ nodesDown, catalog }) {
  if (!nodesDown || !nodesDown.length) return null;
  const names = nodesDown.map((k) => {
    const b = (catalog || []).find((x) => x.node_key === k);
    return b ? b.name : 'العقدة ' + k;
  });
  return <div className="warn-box">تنبيه: تعذر الوصول إلى {names.join(' و ')} - البيانات المعروضة من العقد المتاحة فقط.</div>;
}
