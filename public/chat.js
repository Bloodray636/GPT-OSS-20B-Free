let authToken = localStorage.getItem('auth_token');

// Состояния приложения
const state = {
  currentUser: null,
  currentChatId: null,
  chats: [],
  streaming: false,
  streamingData: {
    reasoningDiv: null,
    contentDiv: null,
    abortController: null
  },
  modals: {
    editMessageDiv: null,
    renameChatId: null,
    confirmCallback: null
  }
};

// DOM элементы
const DOM = {
  chatContainer: document.getElementById('chatContainer'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  reasoningSelect: document.getElementById('reasoningSelect'),
  chatList: document.getElementById('chatList'),
  currentChatTitle: document.getElementById('currentChatTitle'),
  newChatBtn: document.getElementById('newChatBtn'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmYesBtn: document.getElementById('confirmYesBtn'),
  confirmNoBtn: document.getElementById('confirmNoBtn'),
  editModal: document.getElementById('editModal'),
  editMessageText: document.getElementById('editMessageText'),
  editSaveBtn: document.getElementById('editSaveBtn'),
  editCancelBtn: document.getElementById('editCancelBtn'),
  renameModal: document.getElementById('renameModal'),
  renameChatInput: document.getElementById('renameChatInput'),
  renameSaveBtn: document.getElementById('renameSaveBtn'),
  renameCancelBtn: document.getElementById('renameCancelBtn'),
  infoModal: document.getElementById('infoModal'),
  infoTitle: document.getElementById('infoTitle'),
  infoMessage: document.getElementById('infoMessage'),
  infoOkBtn: document.getElementById('infoOkBtn'),
  sidebarUsername: document.getElementById('sidebarUsername'),
  userAvatar: document.getElementById('userAvatar'),
  userMenuTrigger: document.getElementById('userMenuTrigger'),
  userDropdown: document.getElementById('userDropdown'),
  logoutBtnFromMenu: document.getElementById('logoutBtnFromMenu')
};

// Утилиты
const escapeHtml = (str) =>
  str.replace(/[&<>]/g, (m) => ({ 
    '&': '&amp;', 
    '<': '&lt;', 
    '>': '&gt;' 
  }[m]));

const scrollToBottom = () => {
  DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
};

// Копирование кода из блоков <pre>
const attachCopyToCodeBlocks = (container) => {
  if (!container) return;
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')) return;

    const copyBtn = document.createElement('div');
    copyBtn.className = 'copy-code-btn';

    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/>
      </svg>
    `;

    copyBtn.title = 'Копировать код';

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      const code = pre.querySelector('code')?.innerText || pre.innerText;

      navigator.clipboard.writeText(code).then(() => {
        showInfoModal('Успех', 'Код скопирован');
      }).catch(() => showInfoModal('Ошибка', 'Не удалось скопировать код'));
    });

    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
  });
};

// Обновление токена
const refreshToken = async () => {
  const refresh_token = localStorage.getItem('refresh_token');

  if (!refresh_token) return false;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token })
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      authToken = data.access_token;
      return true;
    }

    return false;
  } catch (err) {
    console.error('Refresh token error:', err);
    return false;
  }
};

// Запрос с авторизацией
const fetchJSON = async (url, options = {}, retry = true) => {
  const headers = options.headers || {};

  if (authToken){
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshToken();

    if (refreshed) return fetchJSON(url, options, false);

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/auth.html';

    throw new Error('Session expired');
  }

  if (!res.ok) throw new Error(await res.text());

  return res.json();
};

// Модальные окна
const closeAllModals = () => {
  const modals = [DOM.confirmModal, DOM.editModal, DOM.renameModal, DOM.infoModal];

  modals.forEach(modal => { 
    if (modal) {
      modal.style.display = 'none';
    } 
  });
};

const showInfoModal = (title, message) => {
  DOM.infoTitle.textContent = title;
  DOM.infoMessage.textContent = message;
  DOM.infoModal.style.display = 'flex';
};

const showConfirm = (title, message, onConfirm) => {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMessage.textContent = message;
  DOM.confirmModal.style.display = 'flex';
  state.modals.confirmCallback = onConfirm;
};

const showEditModal = (messageDiv, text) => {
  state.modals.editMessageDiv = messageDiv;
  DOM.editMessageText.value = text;
  DOM.editModal.style.display = 'flex';
  DOM.editMessageText.focus();
};

const showRenameModal = (chatId, currentTitle) => {
  state.modals.renameChatId = chatId;
  DOM.renameChatInput.value = currentTitle;
  DOM.renameModal.style.display = 'flex';
  DOM.renameChatInput.focus();
};

// Обработчики кнопок модалок
if (DOM.confirmYesBtn) {
  DOM.confirmYesBtn.onclick = () => {
    if (state.modals.confirmCallback) state.modals.confirmCallback();
    closeAllModals();
    state.modals.confirmCallback = null;
  };
}

if (DOM.confirmNoBtn) DOM.confirmNoBtn.onclick = closeAllModals;

if (DOM.infoOkBtn) DOM.infoOkBtn.onclick = () => DOM.infoModal.style.display = 'none';

if (DOM.editCancelBtn) DOM.editCancelBtn.onclick = () => DOM.editModal.style.display = 'none';

if (DOM.editSaveBtn) {
  DOM.editSaveBtn.onclick = async () => {
    const newText = DOM.editMessageText.value.trim();

    if (!newText) return;

    closeAllModals();

    await applyEditMessage(state.modals.editMessageDiv, newText);
    state.modals.editMessageDiv = null;
  };
}

if (DOM.renameCancelBtn) DOM.renameCancelBtn.onclick = () => DOM.renameModal.style.display = 'none';

if (DOM.renameSaveBtn) {
  DOM.renameSaveBtn.onclick = async () => {
    const newTitle = DOM.renameChatInput.value.trim();

    if (newTitle && state.modals.renameChatId){
      await renameChatById(state.modals.renameChatId, newTitle);
    }

    closeAllModals();

    state.modals.renameChatId = null;
  };
}

// Управление чатами
const renderChatList = () => {
  DOM.chatList.innerHTML = '';

  state.chats.forEach(chat => {
    const li = document.createElement('li');
    li.dataset.id = chat.id;

    if (state.currentChatId === chat.id) li.classList.add('active');

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
      <button class="rename-chat-item">Переименовать</button>
      <button class="delete-chat-item">Удалить</button>
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
  // Закрыть меню при клике вне
  document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(d => d.style.display = 'none');
  });
};

const loadChats = async () => {
  const res = await fetchJSON('/api/chats?_=' + Date.now());
  state.chats = res;
  renderChatList();
};

const renameChatById = async (chatId, newTitle) => {
  try {
    const res = await fetchJSON(`/api/chats/${chatId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    if (res.success) {
      const chat = state.chats.find(c => c.id === chatId);

      if (chat) chat.title = newTitle;

      renderChatList();

      if (state.currentChatId === chatId) DOM.currentChatTitle.textContent = newTitle;

    } else {
      showInfoModal('Ошибка', 'Не удалось переименовать чат');
    }
  } catch {
    showInfoModal('Ошибка', 'Ошибка соединения');
  }
};

const deleteChatConfirm = (chatId) => {
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

const createNewChat = async () => {
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

const openChat = async (chatId) => {
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
      for (const msg of chat.messages) await appendMessageToDOM(msg.role, msg.content, msg.reasoning);
    } else {
      await appendMessageToDOM('assistant', '✨ Новый чат. Напишите что-нибудь...');
    }

    scrollToBottom();
  } catch (err) {
    console.warn(`Chat ${chatId} not found, reloading list`);

    await loadChats();

    if (state.chats.length > 0){
      await openChat(state.chats[0].id);
    } else {
      await createNewChat();
    }
  }
};

// Отображение сообщений
const appendMessageToDOM = async (role, content, reasoning = null) => {
  if (role === 'user') {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    
    userDiv.innerHTML = `
      <div class="bubble">${escapeHtml(content)}</div>
      <span class="edit-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="m21.71 4.72l-2.43-2.43a1 1 0 0 0-1.41 0l-5.58 5.58a1 1 0 0 0-.29.71V11a1 1 0 0 0 1 1h2.42a1 1 0 0 0 .71-.29l5.58-5.58a1 1 0 0 0 0-1.41M15 10h-1V9l4.58-4.58l1 1Zm4 2a1 1 0 0 0-1 1a7 7 0 0 1-7 7H5.41l.64-.63a1 1 0 0 0 0-1.42A7 7 0 0 1 11 6a1 1 0 0 0 0-2a9 9 0 0 0-7 14.62l-1.71 1.67a1 1 0 0 0-.21 1.09A1 1 0 0 0 3 22h8a9 9 0 0 0 9-9a1 1 0 0 0-1-1"/>
        </svg>
      </span>
    `;

    DOM.chatContainer.appendChild(userDiv);

    userDiv.querySelector('.edit-icon').addEventListener('click', () => showEditModal(userDiv, content));

  } else if (role === 'assistant') {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';

    const formatted = typeof marked !== 'undefined' ? marked.parse(content, { async: false }) : escapeHtml(content);
    const reasoningHtml = reasoning ? `<div class="reasoning-block">${escapeHtml(reasoning)}</div>` : '';

    assistantDiv.innerHTML = `
      ${reasoningHtml}
      <div class="content-block">${formatted}</div>
      <div class="copy-response-btn" title="Копировать ответ">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/>
        </svg>
      </div>
    `;

    DOM.chatContainer.appendChild(assistantDiv);

    const copyBtn = assistantDiv.querySelector('.copy-response-btn');

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        showInfoModal('Успех', 'Ответ скопирован');
      }).catch(() => showInfoModal('Ошибка', 'Не удалось скопировать ответ'));
    });

    attachCopyToCodeBlocks(assistantDiv);
  }

  scrollToBottom();
};

// Потоковые контейнеры
const createStreamingAssistantContainer = () => {
  const assistantDiv = document.createElement('div');
  assistantDiv.className = 'message assistant';

  const reasoningBlock = document.createElement('div');
  reasoningBlock.className = 'reasoning-block';
  reasoningBlock.style.display = 'none';

  const contentBlock = document.createElement('div');
  contentBlock.className = 'content-block';
  contentBlock.dataset.raw = '';
  assistantDiv.appendChild(reasoningBlock);
  assistantDiv.appendChild(contentBlock);
  DOM.chatContainer.appendChild(assistantDiv);

  scrollToBottom();

  return { reasoningBlock, contentBlock };
};

const updateReasoning = (text) => {
  if (state.streamingData.reasoningDiv) {
    state.streamingData.reasoningDiv.innerHTML += escapeHtml(text);
    state.streamingData.reasoningDiv.style.display = 'block';
    scrollToBottom();
  }
};

const updateContent = (text) => {
  if (state.streamingData.contentDiv) {
    if (!state.streamingData.contentDiv.dataset.raw) {
      state.streamingData.contentDiv.dataset.raw = '';
    }

    state.streamingData.contentDiv.dataset.raw += text;

    const raw = state.streamingData.contentDiv.dataset.raw.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '[Изображение не поддерживается]');
    state.streamingData.contentDiv.innerHTML = marked.parse(raw, { async: false });
    attachCopyToCodeBlocks(state.streamingData.contentDiv);
    scrollToBottom();
  }
};

const applyEditMessage = async (messageDiv, newText) => {
  if (state.streaming) {
    showInfoModal('Внимание', 'Дождитесь окончания ответа');
    return;
  }

  const allMessages = Array.from(DOM.chatContainer.querySelectorAll('.message'));
  const index = allMessages.indexOf(messageDiv);

  if (index === -1) return;

  const truncateRes = await fetch(`/api/chats/${state.currentChatId}/truncate`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: JSON.stringify({ keepIndex: index - 1 })
  });

  if (!truncateRes.ok) {
    showInfoModal('Ошибка', 'Не удалось обновить историю');
    return;
  }

  for (let i = index; i < allMessages.length; i++){
    allMessages[i].remove();
  }

  await appendMessageToDOM('user', newText);
  await generateNewResponse(newText);
};

const generateNewResponse = async (userMessage) => {
  const { reasoningBlock, contentBlock } = createStreamingAssistantContainer();
  state.streamingData.reasoningDiv = reasoningBlock;
  state.streamingData.contentDiv = contentBlock;
  state.streaming = true;
  DOM.sendBtn.disabled = true;
  DOM.stopBtn.style.display = 'inline-block';

  const reasoningEffort = DOM.reasoningSelect.value;
  state.streamingData.abortController = new AbortController();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        chatId: state.currentChatId,
        newMessage: userMessage,
        reasoning_effort: reasoningEffort
      }),

      signal: state.streamingData.abortController.signal
    });

    const reader = response.body.getReader();

    const decoder = new TextDecoder();

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'reasoning') {
              updateReasoning(data.text);
            } else if (data.type === 'content') {
              updateContent(data.text);
            } else if (data.type === 'error') {
              updateContent(`Ошибка: ${data.message}`);
            }
          } catch (e) {}
        }
      }
    }

    await loadChats();

    const updatedChat = state.chats.find(c => c.id === state.currentChatId);

    if (updatedChat && DOM.currentChatTitle.textContent !== updatedChat.title){
      DOM.currentChatTitle.textContent = updatedChat.title;
    }
      
  } catch (err) {
    if (err.name !== 'AbortError'){
      updateContent(`Ошибка: ${err.message}`);
    }
  } finally {
    state.streaming = false;
    DOM.sendBtn.disabled = false;
    DOM.stopBtn.style.display = 'none';
    state.streamingData.reasoningDiv = null;
    state.streamingData.contentDiv = null;
    state.streamingData.abortController = null;
    DOM.userInput.focus();
  }
};

const sendMessage = async () => {
  const text = DOM.userInput.value.trim();

  if (!text || state.streaming) return;

  DOM.userInput.value = '';
  await appendMessageToDOM('user', text);
  await generateNewResponse(text);
};

const stopGeneration = () => {
  if (state.streamingData.abortController) {
    state.streamingData.abortController.abort();
    updateContent('(генерация остановлена)');
    state.streaming = false;
    DOM.sendBtn.disabled = false;
    DOM.stopBtn.style.display = 'none';
  }
};

// Аватар
const loadAvatar = async () => {
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

// Авторизация и инициализация
const checkAuth = async () => {
  try {
    await refreshToken();

    const data = await fetchJSON('/api/auth/status');

    if (!data.authenticated) throw new Error('Not authenticated');

    state.currentUser = data.username;

    if (DOM.sidebarUsername) {
      DOM.sidebarUsername.textContent = state.currentUser;
    }

    await loadAvatar();
    await loadChats();

    if (state.currentChatId && !state.chats.some(c => c.id === state.currentChatId)){
      state.currentChatId = null;
    }

    if (state.chats.length === 0){
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

// Старт приложения
document.addEventListener('DOMContentLoaded', () => {
  window.onclick = (e) => {
    if (e.target === DOM.confirmModal) DOM.confirmModal.style.display = 'none';
    if (e.target === DOM.editModal) DOM.editModal.style.display = 'none';
    if (e.target === DOM.renameModal) DOM.renameModal.style.display = 'none';
    if (e.target === DOM.infoModal) DOM.infoModal.style.display = 'none';
  };

  DOM.newChatBtn?.addEventListener('click', createNewChat);
  DOM.sendBtn?.addEventListener('click', sendMessage);
  DOM.stopBtn?.addEventListener('click', stopGeneration);

  DOM.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Меню пользователя
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

  // Выход
  if (DOM.logoutBtnFromMenu) {
    DOM.logoutBtnFromMenu.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { 
        method: 'POST', headers: authToken ? { 
          Authorization: `Bearer ${authToken}` 
        } : {} 
      });
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/auth.html';
    });
  }

  // Бургер-меню
  const burgerMenu = document.getElementById('burgerMenu');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (burgerMenu && sidebar && sidebarOverlay) {
    const toggleSidebar = () => {
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('active');
    };

    burgerMenu.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && sidebar.classList.contains('open')) toggleSidebar();
    });
  }

  checkAuth();
});