document.addEventListener('DOMContentLoaded', () => {
  const loginFormDiv = document.getElementById('loginForm');
  const registerFormDiv = document.getElementById('registerForm');
  const showRegisterLink = document.getElementById('showRegister');
  const showLoginLink = document.getElementById('showLogin');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  // Переключение между формами
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.style.display = 'none';
    registerFormDiv.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
    loginError.textContent = '';
    registerError.textContent = '';
  });

  // Логин
  loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
      loginError.textContent = 'Заполните все поля';
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/chat.html';
      } else {
        loginError.textContent = data.error || 'Ошибка входа';
      }
    } catch {
      loginError.textContent = 'Ошибка соединения';
    }
  });

  // Регистрация
  registerBtn.addEventListener('click', async () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    if (!username || !password || !confirm) {
      registerError.textContent = 'Заполните все поля';
      return;
    }
    if (password !== confirm) {
      registerError.textContent = 'Пароли не совпадают';
      return;
    }
    if (password.length < 6) {
      registerError.textContent = 'Пароль должен быть не менее 6 символов';
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      registerError.textContent = 'Имя: только буквы, цифры, подчеркивание';
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/chat.html';
      } else {
        registerError.textContent = data.error || 'Ошибка регистрации';
      }
    } catch {
      registerError.textContent = 'Ошибка соединения';
    }
  });

  // Глазки для паролей
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });
});