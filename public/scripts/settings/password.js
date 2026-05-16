import { DOM } from './config.js';
import { fetchJSON, showInfoModal, closeAllModals } from './utils.js';

export const changePassword = async () => {
  const oldPwd = DOM.oldPasswordInput.value;
  const newPwd = DOM.newPasswordInput.value;
  const confirmPwd = DOM.confirmPasswordInput.value;

  if (!oldPwd || !newPwd || !confirmPwd) {
    DOM.passwordError.textContent = 'Заполните все поля';
    return;
  }

  if (newPwd !== confirmPwd) {
    DOM.passwordError.textContent = 'Новые пароли не совпадают';
    return;
  }

  if (newPwd.length < 6) {
    DOM.passwordError.textContent = 'Пароль должен быть не менее 6 символов';
    return;
  }

  try {
    await fetchJSON('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    });

    showInfoModal('Успех', 'Пароль изменён');

    closeAllModals();

    DOM.oldPasswordInput.value = DOM.newPasswordInput.value = DOM.confirmPasswordInput.value = '';
    DOM.passwordError.textContent = '';
    
  } catch (err) {
    DOM.passwordError.textContent = err.message || 'Ошибка';
  }
};