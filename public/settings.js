// public/settings.js

// ===================== Глобальные переменные =====================
let authToken = localStorage.getItem('auth_token');
let currentUser = null;

// ===================== DOM элементы =====================
const DOM = {
  // Вкладки и панели
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanes: {
    general: document.getElementById('tab-general'),
    profile: document.getElementById('tab-profile'),
    data: document.getElementById('tab-data')
  },
  // Тема
  themeRadios: document.querySelectorAll('input[name="theme"]'),
  // Профиль
  settingsAvatar: document.getElementById('settingsAvatar'),
  changeAvatarBtn: document.getElementById('changeAvatarBtn'),
  avatarInput: document.getElementById('avatarInput'),
  profileUsername: document.getElementById('profileUsername'),
  profileEmail: document.getElementById('profileEmail'),
  changePasswordBtn: document.getElementById('changePasswordBtn'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
  // Данные
  deleteAllChatsBtn: document.getElementById('deleteAllChatsBtn'),
  // Модальные окна
  changePasswordModal: document.getElementById('changePasswordModal'),
  changeUsernameModal: document.getElementById('changeUsernameModal'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmYesBtn: document.getElementById('confirmYesBtn'),
  confirmNoBtn: document.getElementById('confirmNoBtn'),
  infoModal: document.getElementById('infoModal'),
  infoTitle: document.getElementById('infoTitle'),
  infoMessage: document.getElementById('infoMessage'),
  infoOkBtn: document.getElementById('infoOkBtn'),
  deleteAccountModal: document.getElementById('deleteAccountModal'),
  deleteAccountPassword: document.getElementById('deleteAccountPassword'),
  cancelDeleteAccountBtn: document.getElementById('cancelDeleteAccountBtn'),
  confirmDeleteAccountBtn: document.getElementById('confirmDeleteAccountBtn'),
  deleteAccountError: document.getElementById('deleteAccountError'),
  oldPasswordInput: document.getElementById('oldPassword'),
  newPasswordInput: document.getElementById('newPassword'),
  confirmPasswordInput: document.getElementById('confirmPassword'),
  passwordError: document.getElementById('passwordError'),
  newUsernameInput: document.getElementById('newUsername'),
  usernameError: document.getElementById('usernameError'),
  cancelPasswordBtn: document.getElementById('cancelPasswordBtn'),
  savePasswordBtn: document.getElementById('savePasswordBtn'),
  cancelUsernameBtn: document.getElementById('cancelUsernameBtn'),
  saveUsernameBtn: document.getElementById('saveUsernameBtn')
};

// ===================== Утилиты =====================
const fetchJSON = async (url, options = {}) => {
  const headers = options.headers || {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const showInfoModal = (title, message) => {
  DOM.infoTitle.textContent = title;
  DOM.infoMessage.textContent = message;
  DOM.infoModal.style.display = 'flex';
};

const showConfirm = (title, message, onConfirm) => {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMessage.textContent = message;
  DOM.confirmModal.style.display = 'flex';
  DOM.confirmYesBtn.onclick = () => {
    DOM.confirmModal.style.display = 'none';
    onConfirm();
  };
  DOM.confirmNoBtn.onclick = () => DOM.confirmModal.style.display = 'none';
};

const closeAllModals = () => {
  const modals = [
    DOM.changePasswordModal,
    DOM.changeUsernameModal,
    DOM.confirmModal,
    DOM.infoModal,
    DOM.deleteAccountModal
  ];
  modals.forEach(m => m && (m.style.display = 'none'));
};

const applyTheme = (theme) => {
  document.body.classList.toggle('dark', theme === 'dark');
  document.body.classList.toggle('light', theme === 'light');
};

const loadTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  const radio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);
  if (radio) radio.checked = true;
};

const saveTheme = (theme) => {
  localStorage.setItem('theme', theme);
  applyTheme(theme);
};

// ===================== Профиль =====================
const loadProfileData = async () => {
  try {
    const status = await fetchJSON('/api/auth/status');
    DOM.profileUsername.textContent = status.username;
    DOM.profileEmail.textContent = status.email;
    currentUser = status.username;
  } catch (err) {
    console.error('Load profile error:', err);
  }
};

const loadAvatar = async () => {
  try {
    const res = await fetch('/api/user/avatar', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (res.status === 404) {
      DOM.settingsAvatar.src = '/default-avatar.svg';
      return;
    }
    const data = await res.json();
    DOM.settingsAvatar.src = data.url || '/default-avatar.svg';
  } catch {
    DOM.settingsAvatar.src = '/default-avatar.svg';
  }
};

const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const res = await fetch('/api/user/avatar/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData
    });
    if (!res.ok) throw new Error(await res.text());
    await loadAvatar();
    showInfoModal('Успех', 'Аватар обновлён');
  } catch (err) {
    showInfoModal('Ошибка', err.message);
  }
};

// ===================== Смена пароля =====================
const changePassword = async () => {
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

// ===================== Удаление аккаунта =====================
if (DOM.cancelDeleteAccountBtn) DOM.cancelDeleteAccountBtn.onclick = () => DOM.deleteAccountModal.style.display = 'none';
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
      if (!res.ok) throw new Error(await res.text());
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

// ===================== Удаление всех чатов =====================
DOM.deleteAllChatsBtn.onclick = () => {
  showConfirm('Удалить все чаты', 'Все чаты будут удалены безвозвратно. Продолжить?', async () => {
    await fetch('/api/chats/all', { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
    showInfoModal('Готово', 'Все чаты удалены');
  });
};

// ===================== Инициализация =====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadProfileData();
  await loadAvatar();
  loadTheme();

  // Вкладки
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = {
    general: document.getElementById('tab-general'),
    profile: document.getElementById('tab-profile'),
    data: document.getElementById('tab-data')
  };
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      Object.values(tabPanes).forEach(pane => pane.classList.remove('active'));
      btn.classList.add('active');
      tabPanes[tabId].classList.add('active');
    });
  });

  // Тема
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) saveTheme(e.target.value);
    });
  });

  // Аватар
  DOM.changeAvatarBtn.onclick = () => DOM.avatarInput.click();
  DOM.avatarInput.onchange = (e) => {
    if (e.target.files[0]) uploadAvatar(e.target.files[0]);
  };

  // Смена пароля
  DOM.changePasswordBtn.onclick = () => DOM.changePasswordModal.style.display = 'flex';
  DOM.cancelPasswordBtn.onclick = () => closeAllModals();
  DOM.savePasswordBtn.onclick = changePassword;

  // Удаление аккаунта
  DOM.deleteAccountBtn.onclick = () => DOM.deleteAccountModal.style.display = 'flex';

  // Глазки для паролей
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Закрытие модалок по клику вне
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
  };
  DOM.infoOkBtn.onclick = () => DOM.infoModal.style.display = 'none';
});