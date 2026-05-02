document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('loginError');
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) window.location.href = '/chat.html';
        else errorDiv.textContent = data.error || 'Ошибка входа';
      } catch (err) {
        errorDiv.textContent = 'Ошибка соединения';
      }
    });