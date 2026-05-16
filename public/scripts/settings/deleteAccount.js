import { authToken, DOM } from './config.js';
import { showInfoModal } from './utils.js';

if (DOM.cancelDeleteAccountBtn) {
  DOM.cancelDeleteAccountBtn.onclick = () => {
    DOM.deleteAccountModal.style.display = 'none';
  }
}

if (DOM.confirmDeleteAccountBtn) {
  DOM.confirmDeleteAccountBtn.onclick = async () => {
    const pwd = DOM.deleteAccountPassword.value;

    if (!pwd) {
      DOM.deleteAccountError.textContent = 'Введите пароль';
      return;
    }

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ password: pwd })
      });

      if (!res.ok){
        throw new Error(await res.text());
      }

      showInfoModal('Аккаунт удалён', 'Перенаправление...');

      setTimeout(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth.html';
      }, 1500);
      
    } catch (err) {
      DOM.deleteAccountError.textContent = err.message || 'Ошибка удаления';
    }
  };
}