// public/settings.js

// ===== Глобальные переменные =====
let authToken = localStorage.getItem('auth_token');
let currentSettings = { theme: 'dark', saveHistory: true };
let currentUser = null;

// ===== DOM элементы =====
const DOM = {
  saveHistoryToggle: document.getElementById('saveHistoryToggle'),
  themeToggle: document.getElementById('themeToggle'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  settingsAvatar: document.getElementById('settingsAvatar'),
  changeAvatarBtn: document.getElementById('changeAvatarBtn'),
  avatarInput: document.getElementById('avatarInput'),
  currentUsername: document.getElementById('currentUsername'),
  changeUsernameBtn: document.getElementById('changeUsernameBtn'),
  changePasswordBtn: document.getElementById('changePasswordBtn'),
  deleteAllChatsBtn: document.getElementById('deleteAllChatsBtn'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
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
  saveUsernameBtn: document.getElementById('saveUsernameBtn'),
};

// ===== Утилиты =====
const fetchJSON = async (url, options = {}) => {
  const headers = options.headers || {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
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
    DOM.deleteAccountModal,
  ];
  modals.forEach(m => m && (m.style.display = 'none'));
};

const applyTheme = (theme) => {
  document.body.classList.toggle('dark', theme === 'dark');
  document.body.classList.toggle('light', theme === 'light');
};

// ===== Загрузка данных пользователя и настроек =====
const loadUserData = async () => {
  try {
    const [settings, status] = await Promise.all([
      fetchJSON('/api/settings'),
      fetchJSON('/api/auth/status'),
    ]);
    currentSettings = settings;
    currentUser = status.username;
    DOM.saveHistoryToggle.checked = currentSettings.saveHistory;
    DOM.themeToggle.checked = currentSettings.theme === 'dark';
    DOM.currentUsername.textContent = currentUser;
    applyTheme(currentSettings.theme);
  } catch (err) {
    console.error(err);
    window.location.href = '/auth.html';
  }
};

const saveSettings = async () => {
  const theme = DOM.themeToggle.checked ? 'dark' : 'light';
  const saveHistory = DOM.saveHistoryToggle.checked;
  await fetchJSON('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, saveHistory }),
  });
  currentSettings = { theme, saveHistory };
  applyTheme(theme);
  showInfoModal('Успех', 'Настройки сохранены');
};

// ===== Аватар =====
const loadAvatar = async () => {
  if (!DOM.settingsAvatar) return;
  try {
    const res = await fetch('/api/user/avatar', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const data = await res.json();
    DOM.settingsAvatar.src = data.url || '/default-avatar.svg';
  } catch (err) {
    console.warn('Avatar load error:', err);
    DOM.settingsAvatar.src = '/default-avatar.svg';
  }
};

const uploadAvatar = async (file) => {
  if (!file.type.startsWith('image/')) {
    showInfoModal('Ошибка', 'Выберите изображение');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showInfoModal('Ошибка', 'Файл не более 5 МБ');
    return;
  }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch('/api/user/avatar/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    showInfoModal('Успех', 'Аватар обновлён');
    await loadAvatar(); // перезагружаем аватар
  } catch (err) {
    console.error(err);
    showInfoModal('Ошибка', err.message || 'Не удалось загрузить аватар');
  }
};

// ===== Профиль (пароль, никнейм) =====
const changePassword = async () => {
  const oldPwd = DOM.oldPasswordInput.value;
  const newPwd = DOM.newPasswordInput.value;
  const confirmPwd = DOM.confirmPasswordInput.value;

  if (!oldPwd || !newPwd || !confirmPwd) {
    DOM.passwordError.textContent = 'Заполните все поля';
    return;
  }
  if (newPwd !== confirmPwd) {
    DOM.passwordError.textContent = 'Пароли не совпадают';
    return;
  }
  if (newPwd.length < 6) {
    DOM.passwordError.textContent = 'Пароль не менее 6 символов';
    return;
  }

  try {
    await fetchJSON('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    showInfoModal('Успех', 'Пароль изменён');
    closeAllModals();
    DOM.oldPasswordInput.value = DOM.newPasswordInput.value = DOM.confirmPasswordInput.value = '';
    DOM.passwordError.textContent = '';
  } catch (err) {
    DOM.passwordError.textContent = err.message || 'Ошибка';
  }
};

const changeUsername = async () => {
  const newName = DOM.newUsernameInput.value.trim();
  if (!newName) {
    DOM.usernameError.textContent = 'Введите новый никнейм';
    return;
  }
  if (newName.length < 3 || !/^[a-zA-Z0-9_]+$/.test(newName)) {
    DOM.usernameError.textContent = 'Минимум 3 символа, буквы/цифры/_';
    return;
  }

  try {
    await fetchJSON('/api/auth/change-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername: newName }),
    });
    showInfoModal('Успех', `Никнейм изменён на ${newName}`);
    closeAllModals();
    DOM.currentUsername.textContent = newName;
    DOM.newUsernameInput.value = '';
    DOM.usernameError.textContent = '';
  } catch (err) {
    DOM.usernameError.textContent = err.message || 'Ошибка';
  }
};

// ===== Управление данными =====
const deleteAllChats = () => {
  showConfirm('Удалить все чаты', 'Все чаты будут удалены безвозвратно. Продолжить?', async () => {
    await fetch('/api/chats/all', { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
    showInfoModal('Готово', 'Все чаты удалены');
  });
};

const deleteAccount = () => {
  DOM.deleteAccountModal.style.display = 'flex';
};
if (DOM.cancelDeleteAccountBtn) DOM.cancelDeleteAccountBtn.onclick = () => DOM.deleteAccountModal.style.display = 'none';
if (DOM.confirmDeleteAccountBtn) {
  DOM.confirmDeleteAccountBtn.onclick = async () => {
    const pwd = DOM.deleteAccountPassword.value;
    if (!pwd) {
      DOM.deleteAccountError.textContent = 'Введите пароль';
      return;
    }
    try {
      await fetchJSON('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      showInfoModal('Аккаунт удалён', 'Перенаправление...');
      setTimeout(() => {
        localStorage.removeItem('auth_token');
        window.location.href = '/auth.html';
      }, 1500);
    } catch (err) {
      DOM.deleteAccountError.textContent = err.message || 'Ошибка удаления';
    }
  };
}

// ===== Инициализация обработчиков =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadUserData();
  await loadAvatar();

  DOM.saveSettingsBtn.onclick = saveSettings;
  DOM.changePasswordBtn.onclick = () => DOM.changePasswordModal.style.display = 'flex';
  DOM.cancelPasswordBtn.onclick = () => closeAllModals();
  DOM.savePasswordBtn.onclick = changePassword;
  DOM.changeUsernameBtn.onclick = () => DOM.changeUsernameModal.style.display = 'flex';
  DOM.cancelUsernameBtn.onclick = () => closeAllModals();
  DOM.saveUsernameBtn.onclick = changeUsername;
  DOM.deleteAllChatsBtn.onclick = deleteAllChats;
  DOM.deleteAccountBtn.onclick = deleteAccount;

  if (DOM.changeAvatarBtn) DOM.changeAvatarBtn.onclick = () => DOM.avatarInput.click();
  if (DOM.avatarInput) {
    DOM.avatarInput.onchange = (e) => {
      if (e.target.files[0]) uploadAvatar(e.target.files[0]);
    };
  }

  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList?.contains('modal')) e.target.style.display = 'none';
  });
  DOM.infoOkBtn.onclick = () => DOM.infoModal.style.display = 'none';
});