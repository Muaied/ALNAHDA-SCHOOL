import { useCallback, useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Nodes from './pages/Nodes';
import Login from './pages/Login';
import { api } from './api';
import { Icon } from './icons';

const TABS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'dashboard' },
  { id: 'students', label: 'الطلاب', icon: 'students' },
  { id: 'teachers', label: 'المعلمون', icon: 'teachers' },
  { id: 'classes', label: 'الفصول', icon: 'classes' },
  { id: 'grades', label: 'الدرجات', icon: 'grades' },
  { id: 'attendance', label: 'الحضور', icon: 'attendance' },
  { id: 'nodes', label: 'حالة العقد', icon: 'nodes' },
];

const ROLE_LABELS = { admin: 'مدير المدرسة', branch_manager: 'مدير فرع', registrar: 'مسؤول تسجيل' };

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem('nahda_token')));
  const [tab, setTab] = useState('dashboard');
  const [branches, setBranches] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // استعادة الجلسة عند فتح الصفحة
  useEffect(() => {
    if (!localStorage.getItem('nahda_token')) return;
    api.get('/auth/me')
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('nahda_token'))
      .finally(() => setChecking(false));
  }, []);

  const loadBranches = useCallback(async () => {
    if (!user) return;
    try { setBranches(await api.get('/branches')); } catch (e) { notify(e.message, true); }
  }, [user, notify]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  if (checking) return <div className="loading">جار التحميل…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'branch_manager';
  const canWriteStudents = isAdmin || isManager || user.role === 'registrar';
  const canManage = isAdmin || isManager; // معلمون وفصول وحذف
  const fixedBranch = isAdmin ? null : user.branch_id;
  const branchName = (branches.find((b) => b.id === user.branch_id) || {}).name;

  const logout = () => {
    localStorage.removeItem('nahda_token');
    window.location.reload();
  };

  const pages = {
    dashboard: <Dashboard notify={notify} />,
    students: <Students branches={branches} notify={notify} canWrite={canWriteStudents} canDelete={canManage} fixedBranch={fixedBranch} />,
    teachers: <Teachers branches={branches} notify={notify} canWrite={canManage} fixedBranch={fixedBranch} />,
    classes: <Classes branches={branches} notify={notify} canWrite={canManage} fixedBranch={fixedBranch} />,
    grades: <Grades branches={branches} notify={notify} canWrite={canWriteStudents} canDelete={canManage} fixedBranch={fixedBranch} />,
    attendance: <Attendance branches={branches} notify={notify} canWrite={canWriteStudents} fixedBranch={fixedBranch} />,
    nodes: <Nodes notify={notify} />,
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><Icon name="school" size={40} /></div>
          <h1>مدرسة النهضة</h1>
          <p>نظام الإدارة الموزع · الخرطوم + عطبرة</p>
        </div>
        {TABS.map((t) => (
          <button key={t.id} className={'nav-btn' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} /> {t.label}
          </button>
        ))}
        <div className="user-box">
          <div><b>{user.full_name}</b></div>
          <div className="role">{ROLE_LABELS[user.role]}{branchName ? ' - ' + branchName : ''}</div>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)', marginTop: 8, width: '100%' }} onClick={logout}><Icon name="logout" size={15} /> تسجيل الخروج</button>
        </div>
      </aside>
      <main className="main">{pages[tab]}</main>
      {toast && <div className={'toast' + (toast.isErr ? ' err' : '')}>{toast.msg}</div>}
    </div>
  );
}
