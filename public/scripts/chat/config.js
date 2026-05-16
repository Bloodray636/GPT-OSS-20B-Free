export let authToken = localStorage.getItem('auth_token');

export const state = {
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

export const DOM = {
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

// Функция для обновления authToken (используется в refreshToken)
export function setAuthToken(newToken) {
  authToken = newToken;
}