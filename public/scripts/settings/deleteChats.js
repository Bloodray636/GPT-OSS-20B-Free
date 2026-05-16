import { authToken, DOM } from './config.js';
import { showConfirm, showInfoModal } from './utils.js';

DOM.deleteAllChatsBtn.onclick = () => {
  showConfirm('Удалить все чаты', 'Все чаты будут удалены безвозвратно. Продолжить?', async () => {
    await fetch('/api/chats/all', { 
      method: 'DELETE', 
      headers: { Authorization: `Bearer ${authToken}` } 
    });
    
    showInfoModal('Готово', 'Все чаты удалены');
  });
};