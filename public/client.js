// public/client.js

// ===== Глобальный токен аутентификации =====
let authToken = localStorage.getItem('auth_token');

// ===== Состояния =====
const state = {
  currentUser: null,
  currentChatId: null,
  chats: [],

  settings: {
    theme: 'dark',
    saveHistory: true
  },

  streaming: false,

  streamingData: {
    reasoningDiv: null,
    contentDiv: null,
    abortController: null
  },

  modals: {
    editMessageDiv: null,
    renameChatId: null,
    confirmCallback: null,
  },
};

// ===== DOM элементы =====
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
  settingsBtn: document.getElementById('settingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  saveHistoryToggle: document.getElementById('saveHistoryToggle'),
  themeToggle: document.getElementById('themeToggle'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  modalClose: document.querySelector('#settingsModal .close'),
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
  changePasswordModal: document.getElementById('changePasswordModal'),
  changeUsernameModal: document.getElementById('changeUsernameModal'),
  oldPasswordInput: document.getElementById('oldPassword'),
  newPasswordInput: document.getElementById('newPassword'),
  confirmPasswordInput: document.getElementById('confirmPassword'),
  passwordError: document.getElementById('passwordError'),
  newUsernameInput: document.getElementById('newUsername'),
  usernameError: document.getElementById('usernameError'),
  sidebarUsername: document.getElementById('sidebarUsername'),
  currentUsernameSpan: document.getElementById('currentUsername'),
  infoModal: document.getElementById('infoModal'),
  infoTitle: document.getElementById('infoTitle'),
  infoMessage: document.getElementById('infoMessage'),
  infoOkBtn: document.getElementById('infoOkBtn'),
  deleteAccountModal: document.getElementById('deleteAccountModal'),
  deleteAccountPassword: document.getElementById('deleteAccountPassword'),
  cancelDeleteAccountBtn: document.getElementById('cancelDeleteAccountBtn'),
  confirmDeleteAccountBtn: document.getElementById('confirmDeleteAccountBtn'),
  deleteAccountError: document.getElementById('deleteAccountError'),
  userAvatar: document.getElementById('userAvatar'),
  settingsAvatar: document.getElementById('settingsAvatar'),
  changeAvatarBtn: document.getElementById('changeAvatarBtn'),
  avatarInput: document.getElementById('avatarInput'),
};

// ===== Утилиты =====
const escapeHtml = (str) => str.replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
const scrollToBottom = () => DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;

// fetchJSON с авторизацией
const fetchJSON = async (url, options = {}) => {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const closeAllModals = () => {
  const modals = [
    DOM.settingsModal,
    DOM.confirmModal,
    DOM.editModal,
    DOM.renameModal,
    DOM.changePasswordModal,
    DOM.changeUsernameModal,
    DOM.infoModal,
    DOM.deleteAccountModal
  ];
  modals.forEach(modal => { if (modal) modal.style.display = 'none'; });
};

// Информационное модальное окно
const showInfoModal = (title, message) => {
  DOM.infoTitle.textContent = title;
  DOM.infoMessage.textContent = message;
  DOM.infoModal.style.display = 'flex';
};

// Подтверждение (да/нет)
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

// Обработчики кнопок модалок (инициализация один раз)
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

// ===== Настройки и тема =====
const applyTheme = (theme) => {
  document.body.classList.toggle('dark', theme === 'dark');
  document.body.classList.toggle('light', theme === 'light');
};

const loadSettings = async () => {
  const res = await fetchJSON('/api/settings');
  state.settings = res;
  DOM.saveHistoryToggle.checked = state.settings.saveHistory;
  DOM.themeToggle.checked = state.settings.theme === 'dark';
};

const saveSettings = async (theme, saveHistory) => {
  await fetchJSON('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, saveHistory }),
  });
  state.settings = { theme, saveHistory };
  applyTheme(theme);
};

// ===== Аватар (через JSON) =====
const loadAvatar = async () => {
  try {
    const res = await fetchJSON('/api/user/avatar');
    if (res.url) {
      DOM.userAvatar.src = res.url;
      DOM.settingsAvatar.src = res.url;
    } else {
      DOM.userAvatar.src = '/default-avatar.svg';
      DOM.settingsAvatar.src = '/default-avatar.svg';
    }
  } catch {
    DOM.userAvatar.src = '/default-avatar.svg';
    DOM.settingsAvatar.src = '/default-avatar.svg';
  }
};

const uploadAvatar = async (file) => {
  // Загружаем файл напрямую в Supabase Storage (используем клиентский Supabase)
  const supabaseUrl = 'https://ваш_проект.supabase.co'; // нужно заменить на реальный URL
  const supabaseAnonKey = 'ваш_anon_ключ'; // заменить
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const fileExt = file.name.split('.').pop();
  const fileName = `avatars/${Date.now()}.${fileExt}`;

  // Загружаем в bucket "avatars"
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Сохраняем ссылку в профиле через API
  const res = await fetchJSON('/api/user/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarUrl: publicUrl }),
  });
  if (!res.success) throw new Error();

  showInfoModal('Успех', 'Аватар обновлён');
  await loadAvatar();
};

const deleteAvatar = async () => {
  await fetchJSON('/api/user/avatar', { method: 'DELETE' });
  await loadAvatar();
  showInfoModal('Успех', 'Аватар удалён');
};

// ===== Управление чатами =====
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

// ===== Отображение сообщений =====
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

  await new Promise(resolve => setTimeout(resolve, 200));
  showInfoModal('Успех', 'Сообщение изменено. Страница будет перезагружена.');
  setTimeout(() => location.reload(), 1000);
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

// ===== Настройки профиля =====
const changePassword = async () => {
  const oldPwd = DOM.oldPasswordInput.value;
  const newPwd = DOM.newPasswordInput.value;
  const confirmPwd = DOM.confirmPasswordInput.value;

  if (!oldPwd || !newPwd || !confirmPwd) {
    DOM.passwordError.textContent = 'Заполните все поля';
    return;
  }
  if (newPwd !== confirmPwd) {
    DOM.passwordError.textContent = 'Новые пароли не совпадают';
    return;
  }
  if (newPwd.length < 6) {
    DOM.passwordError.textContent = 'Пароль должен быть не менее 6 символов';
    return;
  }

  try {
    const res = await fetchJSON('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
    });
    if (res.success) {
      showInfoModal('Успех', 'Пароль успешно изменён');
      closeAllModals();
      DOM.passwordError.textContent = '';
      DOM.oldPasswordInput.value = DOM.newPasswordInput.value = DOM.confirmPasswordInput.value = '';
    } else {
      DOM.passwordError.textContent = res.error || 'Ошибка';
    }
  } catch {
    DOM.passwordError.textContent = 'Ошибка соединения';
  }
};

const changeUsername = async () => {
  const newName = DOM.newUsernameInput.value.trim();
  if (!newName) {
    DOM.usernameError.textContent = 'Введите новый никнейм';
    return;
  }
  if (newName.length < 3 || !/^[a-zA-Z0-9_]+$/.test(newName)) {
    DOM.usernameError.textContent = 'Минимум 3 символа, буквы/цифры/_';
    return;
  }

  try {
    const res = await fetchJSON('/api/auth/change-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newUsername: newName }),
    });
    if (res.success) {
      showInfoModal('Успех', `Никнейм изменён на ${newName}`);
      closeAllModals();
      DOM.usernameError.textContent = '';
      state.currentUser = newName;
      if (DOM.sidebarUsername) DOM.sidebarUsername.textContent = newName;
      if (DOM.currentUsernameSpan) DOM.currentUsernameSpan.textContent = newName;
      DOM.newUsernameInput.value = '';
    } else {
      DOM.usernameError.textContent = res.error || 'Ошибка';
    }
  } catch {
    DOM.usernameError.textContent = 'Ошибка соединения';
  }
};

const deleteAllChats = () => {
  showConfirm('Удалить все чаты', 'Вы уверены, что хотите удалить ВСЕ чаты?', async () => {
    try {
      const chatsToDelete = [...state.chats];
      for (const chat of chatsToDelete) {
        const res = await fetch(`/api/chats/${chat.id}`, { method: 'DELETE', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
        if (!res.ok) console.warn(`Не удалось удалить чат ${chat.id}`);
      }
      state.chats = [];
      state.currentChatId = null;
      renderChatList();
      DOM.chatContainer.innerHTML = '';
      DOM.currentChatTitle.textContent = '';
      await loadChats();
      if (state.chats.length === 0) await createNewChat();
      else await openChat(state.chats[0].id);
      showInfoModal('Готово', 'Все чаты удалены');
    } catch (err) {
      showInfoModal('Ошибка', 'Не удалось удалить все чаты');
    }
  });
};

if (DOM.cancelDeleteAccountBtn) DOM.cancelDeleteAccountBtn.onclick = () => DOM.deleteAccountModal.style.display = 'none';
if (DOM.confirmDeleteAccountBtn) {
  DOM.confirmDeleteAccountBtn.onclick = async () => {
    const pwd = DOM.deleteAccountPassword.value;
    if (!pwd) {
      DOM.deleteAccountError.textContent = 'Введите пароль';
      return;
    }
    try {
      const res = await fetchJSON('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.success) {
        showInfoModal('Аккаунт удалён', 'Перенаправление...');
        setTimeout(() => window.location.href = '/auth.html', 1500);
      } else {
        DOM.deleteAccountError.textContent = res.error || 'Ошибка удаления';
      }
    } catch {
      DOM.deleteAccountError.textContent = 'Ошибка соединения';
    }
  };
}

// ===== Инициализация обработчиков =====
const initSettingsHandlers = () => {
  document.getElementById('changePasswordBtn')?.addEventListener('click', () => DOM.changePasswordModal.style.display = 'flex');
  document.getElementById('cancelPasswordBtn')?.addEventListener('click', () => {
    closeAllModals();
    DOM.passwordError.textContent = '';
    DOM.oldPasswordInput.value = DOM.newPasswordInput.value = DOM.confirmPasswordInput.value = '';
  });
  document.getElementById('savePasswordBtn')?.addEventListener('click', changePassword);

  document.getElementById('changeUsernameBtn')?.addEventListener('click', () => DOM.changeUsernameModal.style.display = 'flex');
  document.getElementById('cancelUsernameBtn')?.addEventListener('click', () => {
    closeAllModals();
    DOM.usernameError.textContent = '';
    DOM.newUsernameInput.value = '';
  });
  document.getElementById('saveUsernameBtn')?.addEventListener('click', changeUsername);

  document.getElementById('deleteAllChatsBtn')?.addEventListener('click', deleteAllChats);
  document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
    DOM.deleteAccountModal.style.display = 'flex';
    DOM.deleteAccountPassword.value = '';
    DOM.deleteAccountError.textContent = '';
  });
  if (DOM.changeAvatarBtn) {
    DOM.changeAvatarBtn.addEventListener('click', () => DOM.avatarInput.click());
  }
  if (DOM.avatarInput) {
    DOM.avatarInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        uploadAvatar(e.target.files[0]);
        e.target.value = '';
      }
    });
  }
};

const initPasswordToggles = () => {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
};

// ===== Авторизация =====
const checkAuth = async () => {
  try {
    const data = await fetchJSON('/api/auth/status');
    if (!data.authenticated) {
      window.location.href = '/auth.html';
      return;
    }
    state.currentUser = data.username;
    if (DOM.sidebarUsername) DOM.sidebarUsername.textContent = state.currentUser;
    if (DOM.currentUsernameSpan) DOM.currentUsernameSpan.textContent = state.currentUser;

    await loadSettings();
    await loadChats();
    await loadAvatar();
    applyTheme(state.settings.theme);
    if (state.chats.length === 0) await createNewChat();
    else await openChat(state.chats[0].id);
  } catch {
    window.location.href = '/auth.html';
  }
};

// ===== Старт приложения =====
document.addEventListener('DOMContentLoaded', () => {
  if (DOM.settingsBtn) {
    DOM.settingsBtn.onclick = () => {
      DOM.saveHistoryToggle.checked = state.settings.saveHistory;
      DOM.themeToggle.checked = state.settings.theme === 'dark';
      DOM.settingsModal.style.display = 'flex';
    };
  }
  if (DOM.modalClose) DOM.modalClose.onclick = () => DOM.settingsModal.style.display = 'none';
  if (DOM.saveSettingsBtn) {
    DOM.saveSettingsBtn.onclick = async () => {
      await saveSettings(DOM.themeToggle.checked ? 'dark' : 'light', DOM.saveHistoryToggle.checked);
      DOM.settingsModal.style.display = 'none';
    };
  }

  window.onclick = (e) => {
    if (e.target === DOM.settingsModal) DOM.settingsModal.style.display = 'none';
    if (e.target === DOM.confirmModal) DOM.confirmModal.style.display = 'none';
    if (e.target === DOM.editModal) DOM.editModal.style.display = 'none';
    if (e.target === DOM.renameModal) DOM.renameModal.style.display = 'none';
    if (e.target === DOM.changePasswordModal) DOM.changePasswordModal.style.display = 'none';
    if (e.target === DOM.changeUsernameModal) DOM.changeUsernameModal.style.display = 'none';
    if (e.target === DOM.infoModal) DOM.infoModal.style.display = 'none';
    if (e.target === DOM.deleteAccountModal) DOM.deleteAccountModal.style.display = 'none';
  };

  DOM.newChatBtn?.addEventListener('click', createNewChat);
  DOM.logoutBtn?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
    authToken = null;
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

  initSettingsHandlers();
  initPasswordToggles();
  checkAuth();
});