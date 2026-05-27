import { DOM } from './config.js';
import { loadTheme, saveTheme, closeAllModals } from './utils.js';
import { loadProfileData, loadAvatar, uploadAvatar } from './profile.js';
import { changePassword } from './password.js';
import './deleteAccount.js';
import './deleteChats.js';

let authToken = localStorage.getItem('auth_token');

// Синхронизация темы с сервером
async function syncThemeFromServer() {
  try {
    const res = await fetch('/api/settings', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (res.ok) {
      const settings = await res.json();
      if (settings.theme) {
        saveTheme(settings.theme);

        const radio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);

        if (radio) {
          radio.checked = true;
        }
      }
    } else {
      loadTheme();
    }
  } catch (err) {
    console.error('Failed to sync theme:', err);
    loadTheme();
  }
}

// Cохранение темы на сервере
async function saveThemeToServer(theme, currentSaveHistory) {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        theme,
        saveHistory: currentSaveHistory
      })
    });
  } catch (err) {
    console.error('Failed to save theme to server:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfileData();
  await loadAvatar();
  
  // Синхронизация темы с сервером
  await syncThemeFromServer();

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

  const themeRadios = document.querySelectorAll('input[name="theme"]');

  const currentSettings = await fetch('/api/settings', {
    headers: { Authorization: `Bearer ${authToken}` }
  }).then(res => res.json()).catch(() => ({}));
  
  themeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const newTheme = e.target.value;
        saveTheme(newTheme); // локально
        await saveThemeToServer(newTheme, currentSettings.saveHistory);
      }
    });
  });

  // Аватар
  DOM.changeAvatarBtn.onclick = () => {
    DOM.avatarInput.click();
  }

  DOM.avatarInput.onchange = (e) => {
    if (e.target.files[0]) {
      uploadAvatar(e.target.files[0]);
    }
  };

  // Смена пароля
  DOM.changePasswordBtn.onclick = () => {
    DOM.changePasswordModal.style.display = 'flex';
  }
  DOM.cancelPasswordBtn.onclick = () => {
    closeAllModals();
  }

  DOM.savePasswordBtn.onclick = changePassword;

  // Удаление аккаунта
  DOM.deleteAccountBtn.onclick = () => {
    DOM.deleteAccountModal.style.display = 'flex';
  }

  // Глазки для паролей
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);

      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Закрытие модалок по клику вне
  window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  };

  DOM.infoOkBtn.onclick = () => {
    DOM.infoModal.style.display = 'none';
  }
});