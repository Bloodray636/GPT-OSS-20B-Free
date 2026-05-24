import { state, DOM } from './config.js';
import { fetchJSON, scrollToBottom } from './utils.js';
import { showInfoModal } from './modals.js';
import { appendMessageToDOM } from './messageHandlers.js';
import { loadDraft } from './messageHandlers.js';
import { renderChatList } from './chatListRenderer.js';
import { loadChats } from './chatApi.js';

export const createNewChat = async () => {
  try {
    const newChat = await fetchJSON('/api/chats', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
            title: 'Новый чат' 
        })
    });

    state.chats.unshift(newChat);
    
    renderChatList();

    await openChat(newChat.id);
  } catch {
    showInfoModal('Ошибка', 'Не удалось создать чат');
  }
};

export const openChat = async (chatId) => {
  if (state.streaming) {
    showInfoModal('Внимание', 'Дождитесь окончания ответа');
    return;
  }

  state.currentChatId = chatId;
  renderChatList();

  try {
    const chat = await fetchJSON(`/api/chats/${chatId}`);
    DOM.currentChatTitle.textContent = chat.title;
    DOM.chatContainer.innerHTML = '';

    if (chat.messages?.length) {
      for (const msg of chat.messages) {
        await appendMessageToDOM(msg.role, msg.content, msg.reasoning);
      }
    } else {
      await appendMessageToDOM('assistant', '✨ Новый чат. Напишите что-нибудь...');
    }

    // Удаление визуальных дублей сообщений пользователя
    const userMessages = Array.from(DOM.chatContainer.querySelectorAll('.message.user'));
    const seenBubbles = new Set();

    for (let i = userMessages.length - 1; i >= 0; i--) {
      const bubble = userMessages[i].querySelector('.bubble');

      if (!bubble) {
        continue;
      }

      const text = bubble.innerText;

      if (seenBubbles.has(text)) {
        userMessages[i].style.display = 'none';
      } else {
        seenBubbles.add(text);
      }
    }

    const draft = loadDraft();
    DOM.userInput.value = draft;

    scrollToBottom();
  } catch (err) {
    await loadChats();

    if (state.chats.length > 0) {
      await openChat(state.chats[0].id);
    } else {
      await createNewChat();
    }
  }
};