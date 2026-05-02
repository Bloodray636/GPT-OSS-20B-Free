document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  if (!email || !password) {
    errorDiv.textContent = 'Заполните все поля';
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
      if (data.token) localStorage.setItem('auth_token', data.token);
      window.location.href = '/chat.html';
    } else {
      errorDiv.textContent = data.error || 'Ошибка входа';
    }
  } catch (err) {
    errorDiv.textContent = 'Ошибка соединения';
  }
});