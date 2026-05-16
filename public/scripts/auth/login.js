import { elements } from './domElements.js';

export async function handleLogin() {
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    elements.loginError.textContent = 'Заполните все поля';
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      window.location.href = '/chat.html';
    } else {
      elements.loginError.textContent = data.error || 'Ошибка входа';
    }
  } catch {
    elements.loginError.textContent = 'Ошибка соединения';
  }
}