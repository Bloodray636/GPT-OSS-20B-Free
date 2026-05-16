import { authToken, DOM } from './config.js';

export const loadAvatar = async () => {
  if (!DOM.userAvatar) return;

  try {
    const res = await fetch('/api/user/avatar', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    });

    const data = await res.json();
    
    DOM.userAvatar.src = data.url || '/default-avatar.svg';
  } catch {
    DOM.userAvatar.src = '/default-avatar.svg';
  }
};