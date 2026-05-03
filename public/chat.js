// public/chat.js

// Глобальный токен
let authToken = localStorage.getItem('auth_token');

// Состояния
const state = {
  currentUser: null,
  currentChatId: null,
  chats: [],
  streaming: false,
  streamingData: { reasoningDiv: null, contentDiv: null, abortController: null },
  modals: { editMessageDiv: null, renameChatId: null, confirmCallback: null },
};

// DOM элементы (только для чата)
const DOM = {
  chatContainer: document.getElementById('chatContainer'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  reasoningSelect: document.getElementById('reasoningSelect'),
  chatList: document.getElementById('chatList'),
  currentChatTitle: document.getElementById('currentChatTitle'),
  newChatBtn: document.getElementById('newChatBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
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
};

// Утилиты
const escapeHtml = (str) => str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const scrollToBottom = () => DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;

const fetchJSON = async (url, options = {}) => {
  const headers = options.headers || {};
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const closeAllModals = () => {
  const modals = [DOM.confirmModal, DOM.editModal, DOM.renameModal, DOM.infoModal];
  modals.forEach(modal => { if (modal) modal.style.display = 'none'; });
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

// Обработчики модальных кнопок
if (DOM.confirmYesBtn) DOM.confirmYesBtn.onclick = () => {
  if (state.modals.confirmCallback) state.modals.confirmCallback();
  closeAllModals();
  state.modals.confirmCallback = null;
};
if (DOM.confirmNoBtn) DOM.confirmNoBtn.onclick = closeAllModals;
if (DOM.infoOkBtn) DOM.infoOkBtn.onclick = () => DOM.infoModal.style.display = 'none';
if (DOM.editCancelBtn) DOM.editCancelBtn.onclick = () => DOM.editModal.style.display = 'none';
if (DOM.editSaveBtn) DOM.editSaveBtn.onclick = async () => {
  const newText = DOM.editMessageText.value.trim();
  if (!newText) return;
  closeAllModals();
  await applyEditMessage(state.modals.editMessageDiv, newText);
  state.modals.editMessageDiv = null;
};
if (DOM.renameCancelBtn) DOM.renameCancelBtn.onclick = () => DOM.renameModal.style.display = 'none';
if (DOM.renameSaveBtn) DOM.renameSaveBtn.onclick = async () => {
  const newTitle = DOM.renameChatInput.value.trim();
  if (newTitle && state.modals.renameChatId) await renameChatById(state.modals.renameChatId, newTitle);
  closeAllModals();
  state.modals.renameChatId = null;
};

// --- Работа с чатами ---
const renderChatList = () => {
  DOM.chatList.innerHTML = '';
  state.chats.forEach(chat => {
    const li = document.createElement('li');
    li.dataset.id = chat.id;
    if (state.currentChatId === chat.id) li.classList.add('active');

    const textSpan = document.createElement('span');
    textSpan.textContent = chat.title || 'Новый чат';
    textSpan.addEventListener('click', () => openChat(chat.id));

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.gap = '4px';

    const renameBtn = document.createElement('button');
    renameBtn.textContent = '✏️';
    renameBtn.className = 'icon-btn small';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showRenameModal(chat.id, chat.title);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'icon-btn small';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChatConfirm(chat.id);
    });

    btnGroup.appendChild(renameBtn);
    btnGroup.appendChild(deleteBtn);

    li.appendChild(textSpan);
    li.appendChild(btnGroup);
    DOM.chatList.appendChild(li);
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
      body: JSON.stringify({ title: newTitle }),
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
    const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    if (res.ok) {
      state.chats = state.chats.filter(c => c.id !== chatId);
      renderChatList();
      if (state.currentChatId === chatId) {
        if (state.chats.length) await openChat(state.chats[0].id);
        else await createNewChat();
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
      body: JSON.stringify({ title: 'Новый чат' }),
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
  } catch {
    showInfoModal('Ошибка', 'Не удалось загрузить чат');
  }
};

// --- Отображение сообщений (без изменений) ---
const appendMessageToDOM = async (role, content, reasoning = null) => {
  if (role === 'user') {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';
    userDiv.innerHTML = `<div class="bubble">${escapeHtml(content)}</div><span class="edit-icon">✏️</span>`;
    DOM.chatContainer.appendChild(userDiv);
    userDiv.querySelector('.edit-icon').addEventListener('click', () => showEditModal(userDiv, content));
  } else if (role === 'assistant') {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';
    const formatted = typeof marked !== 'undefined' ? marked.parse(content, { async: false }) : escapeHtml(content);
    const reasoningHtml = reasoning ? `<div class="reasoning-block">${escapeHtml(reasoning)}</div>` : '';
    assistantDiv.innerHTML = `${reasoningHtml}<div class="content-block">${formatted}</div>`;
    DOM.chatContainer.appendChild(assistantDiv);
  }
  scrollToBottom();
};

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
    if (!state.streamingData.contentDiv.dataset.raw) state.streamingData.contentDiv.dataset.raw = '';
    state.streamingData.contentDiv.dataset.raw += text;
    const raw = state.streamingData.contentDiv.dataset.raw.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '[Изображение не поддерживается]');
    state.streamingData.contentDiv.innerHTML = marked.parse(raw, { async: false });
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
    body: JSON.stringify({ keepIndex: index - 1 }),
  });
  if (!truncateRes.ok) {
    showInfoModal('Ошибка', 'Не удалось обновить историю');
    return;
  }
  for (let i = index; i < allMessages.length; i++) allMessages[i].remove();
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
        reasoning_effort: reasoningEffort,
      }),
      signal: state.streamingData.abortController.signal,
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
            if (data.type === 'reasoning') updateReasoning(data.text);
            else if (data.type === 'content') updateContent(data.text);
            else if (data.type === 'error') updateContent(`Ошибка: ${data.message}`);
          } catch (e) {}
        }
      }
    }
    await loadChats();
    const updatedChat = state.chats.find(c => c.id === state.currentChatId);
    if (updatedChat && DOM.currentChatTitle.textContent !== updatedChat.title)
      DOM.currentChatTitle.textContent = updatedChat.title;
  } catch (err) {
    if (err.name !== 'AbortError') updateContent(`Ошибка: ${err.message}`);
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

// --- Авторизация, загрузка чатов ---
const checkAuth = async () => {
  try {
    const data = await fetchJSON('/api/auth/status');
    if (!data.authenticated) throw new Error('Not authenticated');
    state.currentUser = data.username;
    if (DOM.sidebarUsername) DOM.sidebarUsername.textContent = state.currentUser;
    await loadChats();
    if (state.chats.length === 0) await createNewChat();
    else await openChat(state.chats[0].id);
  } catch (err) {
    console.error('Auth check failed:', err);
    localStorage.removeItem('auth_token');
    window.location.href = '/auth.html';
  }
};

// --- Старт приложения ---
document.addEventListener('DOMContentLoaded', () => {
  window.onclick = (e) => {
    if (e.target === DOM.confirmModal) DOM.confirmModal.style.display = 'none';
    if (e.target === DOM.editModal) DOM.editModal.style.display = 'none';
    if (e.target === DOM.renameModal) DOM.renameModal.style.display = 'none';
    if (e.target === DOM.infoModal) DOM.infoModal.style.display = 'none';
  };

  DOM.newChatBtn?.addEventListener('click', createNewChat);
  DOM.logoutBtn?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    localStorage.removeItem('auth_token');
    window.location.href = '/auth.html';
  });
  DOM.sendBtn?.addEventListener('click', sendMessage);
  DOM.stopBtn?.addEventListener('click', stopGeneration);
  DOM.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Бургер-меню и оверлей
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
      if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
        toggleSidebar();
      }
    });
  }

  checkAuth();
});