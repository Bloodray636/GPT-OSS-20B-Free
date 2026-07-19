import { authToken, DOM, currentUser as currUser } from './config.js';
import { fetchJSON, showInfoModal, closeAllModals } from './utils.js';

export const loadProfileData = async () => {
  try {
    const status = await fetchJSON('/api/auth/status');
    DOM.profileUsername.textContent = status.username;
    DOM.profileEmail.textContent = status.email;
  } catch (err) {}
};

export const loadAvatar = async () => {
  try {
    const res = await fetch('/api/user/avatar/proxy', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      DOM.settingsAvatar.src = url;

      if (DOM.settingsAvatar.dataset.prevBlobUrl) {
        URL.revokeObjectURL(DOM.settingsAvatar.dataset.prevBlobUrl);
      }
      
      DOM.settingsAvatar.dataset.prevBlobUrl = url;
    } else {
      DOM.settingsAvatar.src = '/default-avatar.svg';
    }
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

export const changeUsername = async () => {
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
    const res = await fetch('/api/auth/change-username', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        newUsername: newName 
      })
    });

    const data = await res.json();

    if (res.ok) {
      showInfoModal('Успех', `Никнейм изменён на ${newName}`);
      // Обновляем отображение в настройках
      DOM.currentUsername.textContent = newName;
      DOM.newUsernameInput.value = '';
      DOM.usernameError.textContent = '';
      
      closeAllModals();
    } else {
      DOM.usernameError.textContent = data.error || 'Ошибка';
    }
  } catch {
    DOM.usernameError.textContent = 'Ошибка соединения';
  }
};