import { authToken, state, DOM } from './config.js';
import { fetchJSON, scrollToBottom } from './utils.js';
import { showInfoModal, showConfirm, showRenameModal, closeAllModals } from './modals.js';
import { appendMessageToDOM } from './messageHandlers.js';
import { loadDraft } from './messageHandlers.js';

export const renderChatList = () => {
  DOM.chatList.innerHTML = '';

  state.chats.forEach(chat => {
    const li = document.createElement('li');
    li.dataset.id = chat.id;

    if (state.currentChatId === chat.id){
      li.classList.add('active');
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = chat.title || 'Новый чат';
    textSpan.addEventListener('click', () => openChat(chat.id));

    const menuWrapper = document.createElement('div');
    menuWrapper.style.position = 'relative';

    const menuBtn = document.createElement('button');
    menuBtn.textContent = '⋮';
    menuBtn.className = 'icon-btn small chat-menu-btn';
    menuBtn.title = 'Меню чата';

    const dropdown = document.createElement('div');
    dropdown.className = 'chat-dropdown';
    dropdown.style.display = 'none';

    dropdown.innerHTML = `
      <button class="rename-chat-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="m21.71 4.72l-2.43-2.43a1 1 0 0 0-1.41 0l-5.58 5.58a1 1 0 0 0-.29.71V11a1 1 0 0 0 1 1h2.42a1 1 0 0 0 .71-.29l5.58-5.58a1 1 0 0 0 0-1.41M15 10h-1V9l4.58-4.58l1 1Zm4 2a1 1 0 0 0-1 1a7 7 0 0 1-7 7H5.41l.64-.63a1 1 0 0 0 0-1.42A7 7 0 0 1 11 6a1 1 0 0 0 0-2a9 9 0 0 0-7 14.62l-1.71 1.67a1 1 0 0 0-.21 1.09A1 1 0 0 0 3 22h8a9 9 0 0 0 9-9a1 1 0 0 0-1-1"/>
        </svg>
        Переименовать
      </button>
      <button class="delete-chat-item">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Удалить
      </button>
    `;

    menuWrapper.appendChild(menuBtn);
    menuWrapper.appendChild(dropdown);
    li.appendChild(textSpan);
    li.appendChild(menuWrapper);
    DOM.chatList.appendChild(li);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      document.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    dropdown.querySelector('.rename-chat-item').addEventListener('click', (e) => {
      e.stopPropagation();

      dropdown.style.display = 'none';
      showRenameModal(chat.id, chat.title);
    });

    dropdown.querySelector('.delete-chat-item').addEventListener('click', (e) => {
      e.stopPropagation();

      dropdown.style.display = 'none';
      deleteChatConfirm(chat.id);
    });

  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
  });
};

export const loadChats = async () => {
  const res = await fetchJSON('/api/chats?_=' + Date.now());
  state.chats = res;
  renderChatList();
};

export const renameChatById = async (chatId, newTitle) => {
  try {
    const res = await fetchJSON(`/api/chats/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    if (res.success) {
      const chat = state.chats.find(c => c.id === chatId);

      if (chat){
        chat.title = newTitle;
      }

      renderChatList();

      if (state.currentChatId === chatId){
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
        if (state.chats.length){
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

export const createNewChat = async () => {
  try {
    const newChat = await fetchJSON('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Новый чат' })
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

    const userMessages = Array.from(DOM.chatContainer.querySelectorAll('.message.user'));

    const seenBubbles = new Set();

    for (let i = userMessages.length - 1; i >= 0; i--) {
      const bubble = userMessages[i].querySelector('.bubble');

      if (!bubble) continue;

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
    
    if (state.chats.length > 0){
      await openChat(state.chats[0].id);
    } else {
      await createNewChat();
    }
  }
};