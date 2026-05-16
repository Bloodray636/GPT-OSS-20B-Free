import { authToken, DOM, currentUser as currUser } from './config.js';
import { fetchJSON, showInfoModal } from './utils.js';

export const loadProfileData = async () => {
  try {
    const status = await fetchJSON('/api/auth/status');
    DOM.profileUsername.textContent = status.username;
    DOM.profileEmail.textContent = status.email;
  } catch (err) {}
};

export const loadAvatar = async () => {
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

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch('/api/user/avatar/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    await loadAvatar();
    
    showInfoModal('Успех', 'Аватар обновлён');
  } catch (err) {
    showInfoModal('Ошибка', err.message);
  }
};