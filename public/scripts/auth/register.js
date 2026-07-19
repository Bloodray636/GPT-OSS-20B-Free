import { elements } from './domElements.js';

export async function handleRegister() {
  const username = elements.regUsername.value.trim();
  const email = elements.regEmail.value.trim();
  const password = elements.regPassword.value;
  const confirm = elements.regPasswordConfirm.value;

  if (!username || !email || !password || !confirm) {
    elements.registerError.textContent = 'Заполните все поля';
    return;
  }

  if (password !== confirm) {
    elements.registerError.textContent = 'Пароли не совпадают';
    return;
  }

  if (password.length < 6) {
    elements.registerError.textContent = 'Пароль должен быть не менее 6 символов';
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    elements.registerError.textContent = 'Имя: только буквы, цифры, подчеркивание';
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await res.json();

    if (res.ok) {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('refresh_token', data.refresh_token);
        window.location.href = '/chat.html';
      } else if (data.message) {
        registerError.textContent = data.message;

        setTimeout(() => {
          document.getElementById('showLogin').click();
        }, 2000);
      } else {
        registerError.textContent = 'Аккаунт создан, но произошла ошибка входа. Пожалуйста, войдите вручную.';
      }
    } else {
      registerError.textContent = data.error || 'Ошибка регистрации';
    }
  } catch {
    elements.registerError.textContent = 'Ошибка соединения';
  }
}