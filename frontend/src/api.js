// طبقة الاتصال بالخادم - ترفق رمز الدخول JWT مع كل طلب
const BASE = '/api';

function authHeaders() {
  const token = localStorage.getItem('nahda_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('nahda_token');
    window.location.reload();
    throw new Error('انتهت الجلسة - سجل الدخول من جديد');
  }
  if (!res.ok) {
    let msg = 'خطأ في الاتصال (' + res.status + ')';
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch (e) { /* رسالة افتراضية */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  put: (p, b) => req('PUT', p, b),
  del: (p) => req('DELETE', p),
};
