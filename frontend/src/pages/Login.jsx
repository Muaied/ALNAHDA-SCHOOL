import { useState } from 'react';
import { api } from '../api';
import { Icon } from '../icons';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('nahda_token', res.token);
      onLogin(res.user);
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo" style={{ textAlign: 'center', color: 'var(--primary)' }}><Icon name="school" size={46} /></div>
        <h2>مدرسة النهضة</h2>
        <p className="sub" style={{ textAlign: 'center', marginBottom: 18 }}>تسجيل الدخول إلى نظام الإدارة الموزع</p>
        {err && <div className="error-box">{err}</div>}
        <label className="field"><span>اسم المستخدم</span><input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></label>
        <label className="field"><span>كلمة المرور</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'جار الدخول…' : 'دخول'}</button>
      </form>
    </div>
  );
}
