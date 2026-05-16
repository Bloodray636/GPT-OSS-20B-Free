import { authToken, setAuthToken, DOM } from './config.js';

export const escapeHtml = (str) =>
  str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

export const scrollToBottom = () => {
  DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
};

// Копирование кода из блоков <pre>
export const attachCopyToCodeBlocks = (container) => {
  if (!container) return;
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;
    const copyBtn = document.createElement('div');
    copyBtn.className = 'copy-code-btn';
    copyBtn.innerHTML = 'Копировать';
    copyBtn.title = 'Копировать код';
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = pre.querySelector('code')?.innerText || pre.innerText;
      navigator.clipboard.writeText(code).then(() => {
        showInfoModal('Успех', 'Код скопирован');
      }).catch(() => showInfoModal('Ошибка', 'Не удалось скопировать код'));
    });
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
  });
};

// Обновление токена
export const refreshToken = async () => {
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token })
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      setAuthToken(data.access_token);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Refresh token error:', err);
    return false;
  }
};

// Запрос с авторизацией
export const fetchJSON = async (url, options = {}, retry = true) => {
  const headers = options.headers || {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) return fetchJSON(url, options, false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};