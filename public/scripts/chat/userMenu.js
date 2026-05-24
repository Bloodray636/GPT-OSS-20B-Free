import { DOM } from './config.js';

export const initUserMenu = () => {
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
};