import { DOM } from './config.js';

export const initModalCloser = () => {
  window.onclick = (e) => {
    if (e.target === DOM.confirmModal) DOM.confirmModal.style.display = 'none';
    if (e.target === DOM.editModal) DOM.editModal.style.display = 'none';
    if (e.target === DOM.renameModal) DOM.renameModal.style.display = 'none';
    if (e.target === DOM.infoModal) DOM.infoModal.style.display = 'none';
  };
};