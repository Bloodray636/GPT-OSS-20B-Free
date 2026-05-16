import { authToken, state, DOM } from './config.js';
import { refreshToken, fetchJSON } from './utils.js';
import { loadAvatar } from './avatar.js';
import { loadChats, createNewChat, openChat } from './chatManagement.js';

export const checkAuth = async () => {
  try {
    await refreshToken();
    const data = await fetchJSON('/api/auth/status');
    if (!data.authenticated) throw new Error('Not authenticated');
    state.currentUser = data.username;
    if (DOM.sidebarUsername) DOM.sidebarUsername.textContent = state.currentUser;
    await loadAvatar();
    await loadChats();
    if (state.currentChatId && !state.chats.some(c => c.id === state.currentChatId)) {
      state.currentChatId = null;
    }
    if (state.chats.length === 0) {
      await createNewChat();
    } else {
      await openChat(state.currentChatId || state.chats[0].id);
    }
  } catch (err) {
    console.error('Auth check failed:', err);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';
  }
};