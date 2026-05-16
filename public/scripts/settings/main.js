import { DOM } from './config.js';
import { loadTheme, saveTheme, closeAllModals } from './utils.js';
import { loadProfileData, loadAvatar, uploadAvatar } from './profile.js';
import { changePassword } from './password.js';
import './deleteAccount.js';
import './deleteChats.js';

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
      if (e.target.checked){
        saveTheme(e.target.value);
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
  DOM.changePasswordBtn.onclick = () =>{
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

      if (input){
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