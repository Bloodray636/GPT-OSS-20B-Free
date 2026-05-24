import { authToken, state, DOM } from './config.js';
import { fetchJSON, scrollToBottom } from './utils.js';
import { showInfoModal, showConfirm } from './modals.js';
import { renderChatList } from './chatListRenderer.js';
import { openChat, createNewChat } from './chatActions.js';

export const loadChats = async () => {
  const res = await fetchJSON('/api/chats?_=' + Date.now());
  state.chats = res;
  renderChatList();
};

export const renameChatById = async (chatId, newTitle) => {
  try {
    const res = await fetchJSON(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            title: newTitle 
        })
    });

    if (res.success) {
      const chat = state.chats.find(c => c.id === chatId);

      if (chat) {
        chat.title = newTitle;
      }

      renderChatList();

      if (state.currentChatId === chatId) {
        DOM.currentChatTitle.textContent = newTitle;
      }
    } else {
      showInfoModal('Ошибка', 'Не удалось переименовать чат');
    }
  } catch {
    showInfoModal('Ошибка', 'Ошибка соединения');
  }
};

export const deleteChatConfirm = (chatId) => {
  showConfirm('Удалить чат', 'Вы уверены, что хотите удалить этот чат?', async () => {
    const res = await fetch(`/api/chats/${chatId}`, {
      method: 'DELETE',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    });

    if (res.ok) {
      state.chats = state.chats.filter(c => c.id !== chatId);
      
      renderChatList();

      if (state.currentChatId === chatId) {
        if (state.chats.length) {
            await openChat(state.chats[0].id);
        } else {
            await createNewChat(); 
        }
      }
    } else {
      showInfoModal('Ошибка', 'Не удалось удалить чат');
    }
  });
};