import { DOM, authToken } from './config.js';
import { initModals } from './modals.js';
import { createNewChat, openChat } from './chatManagement.js';
import { sendMessage, stopGeneration } from './messageHandlers.js';
import { checkAuth } from './auth.js';
import { initDraft } from './messageHandlers.js';

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('dark', savedTheme === 'dark');
  document.body.classList.toggle('light', savedTheme === 'light');

  // Инициализация модальных окон
  initModals();

  // Закрытие
  window.onclick = (e) => {
    if (e.target === DOM.confirmModal) {
      DOM.confirmModal.style.display = 'none';
    }

    if (e.target === DOM.editModal) {
      DOM.editModal.style.display = 'none';
    }

    if (e.target === DOM.renameModal) {
      DOM.renameModal.style.display = 'none';
    }

    if (e.target === DOM.infoModal) {
      DOM.infoModal.style.display = 'none';
    }
  };

  DOM.newChatBtn?.addEventListener('click', createNewChat);
  DOM.sendBtn?.addEventListener('click', sendMessage);
  DOM.stopBtn?.addEventListener('click', stopGeneration);

  DOM.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Меню пользователя
  if (DOM.userMenuTrigger && DOM.userDropdown) {
    DOM.userMenuTrigger.addEventListener('click', (e) => {
      e.stopPropagation();

      const isVisible = DOM.userDropdown.style.display === 'block';
      DOM.userDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!DOM.userMenuTrigger.contains(e.target) && !DOM.userDropdown.contains(e.target)) {
        DOM.userDropdown.style.display = 'none';
      }
    });
  }

  // Выход из системы
  if (DOM.logoutBtnFromMenu) {
    DOM.logoutBtnFromMenu.addEventListener('click', async () => {
       const token = localStorage.getItem('auth_token');

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth.html';
    });
  }

  // Бургер-меню
  const burgerMenu = document.getElementById('burgerMenu');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (burgerMenu && sidebar && sidebarOverlay) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    };

    burgerMenu.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && sidebar.classList.contains('open')){
        toggleSidebar();
      }
    });
  }

  initDraft();

  checkAuth();
});