import { authToken, DOM } from './config.js';

export const loadAvatar = async () => {
  if (!DOM.userAvatar) return;

  try {
    const res = await fetch('/api/user/avatar/proxy', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache'
      }
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      DOM.userAvatar.src = url;

      if (DOM.userAvatar.dataset.prevBlobUrl) {
        URL.revokeObjectURL(DOM.userAvatar.dataset.prevBlobUrl);
      }
      
      DOM.userAvatar.dataset.prevBlobUrl = url;
    } else {
      DOM.userAvatar.src = '/default-avatar.svg';
    }
  } catch {
    DOM.userAvatar.src = '/default-avatar.svg';
  }
};