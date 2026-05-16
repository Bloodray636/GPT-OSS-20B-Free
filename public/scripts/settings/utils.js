import { authToken, DOM } from './config.js';

export const fetchJSON = async (url, options = {}) => {
  const headers = options.headers || {};

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { 
    ...options, headers 
  });

  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';
    throw new Error('Unauthorized');
  }

  if (!res.ok){
    throw new Error(await res.text());
  }

  return res.json();
};

export const showInfoModal = (title, message) => {
  DOM.infoTitle.textContent = title;
  DOM.infoMessage.textContent = message;
  DOM.infoModal.style.display = 'flex';
};

export const showConfirm = (title, message, onConfirm) => {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMessage.textContent = message;
  DOM.confirmModal.style.display = 'flex';

  DOM.confirmYesBtn.onclick = () => {
    DOM.confirmModal.style.display = 'none';
    onConfirm();
  };

  DOM.confirmNoBtn.onclick = () => {
    DOM.confirmModal.style.display = 'none';
  }
};

export const closeAllModals = () => {
  const modals = [
    DOM.changePasswordModal,
    DOM.changeUsernameModal,
    DOM.confirmModal,
    DOM.infoModal,
    DOM.deleteAccountModal
  ];

  modals.forEach(m => m && (m.style.display = 'none'));
};

export const applyTheme = (theme) => {
  document.body.classList.toggle('dark', theme === 'dark');
  document.body.classList.toggle('light', theme === 'light');
};

export const loadTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';

  applyTheme(savedTheme);
  
  const radio = document.querySelector(`input[name="theme"][value="${savedTheme}"]`);

  if (radio) {
    radio.checked = true;
  }
};

export const saveTheme = (theme) => {
  localStorage.setItem('theme', theme);
  applyTheme(theme);
};