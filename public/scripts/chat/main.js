import { initModals } from './modals.js';
import { checkAuth } from './auth.js';
import { initDraft } from './messageHandlers.js';
import { initTheme } from './theme.js';
import { initModalCloser } from './modalCloser.js';
import { initEventListeners } from './eventListeners.js';
import { initUserMenu } from './userMenu.js';
import { initLogout } from './logout.js';
import { initBurgerMenu } from './burgerMenu.js';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();
  initModalCloser();
  initEventListeners();
  initUserMenu();
  initLogout();
  initBurgerMenu();
  initDraft();
  checkAuth();
});