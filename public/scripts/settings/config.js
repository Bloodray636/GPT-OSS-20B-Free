export let authToken = localStorage.getItem('auth_token');
export let currentUser = null;

export function setAuthToken(newToken) {
  authToken = newToken;
}

export const DOM = {
  tabBtns: document.querySelectorAll('.tab-btn'),
  
  tabPanes: {
    general: document.getElementById('tab-general'),
    profile: document.getElementById('tab-profile'),
    data: document.getElementById('tab-data')
  },

  themeRadios: document.querySelectorAll('input[name="theme"]'),
  settingsAvatar: document.getElementById('settingsAvatar'),
  changeAvatarBtn: document.getElementById('changeAvatarBtn'),
  avatarInput: document.getElementById('avatarInput'),
  profileUsername: document.getElementById('profileUsername'),
  profileEmail: document.getElementById('profileEmail'),
  changePasswordBtn: document.getElementById('changePasswordBtn'),
  deleteAccountBtn: document.getElementById('deleteAccountBtn'),
  deleteAllChatsBtn: document.getElementById('deleteAllChatsBtn'),
  changePasswordModal: document.getElementById('changePasswordModal'),
  changeUsernameModal: document.getElementById('changeUsernameModal'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  confirmYesBtn: document.getElementById('confirmYesBtn'),
  confirmNoBtn: document.getElementById('confirmNoBtn'),
  infoModal: document.getElementById('infoModal'),
  infoTitle: document.getElementById('infoTitle'),
  infoMessage: document.getElementById('infoMessage'),
  infoOkBtn: document.getElementById('infoOkBtn'),
  deleteAccountModal: document.getElementById('deleteAccountModal'),
  deleteAccountPassword: document.getElementById('deleteAccountPassword'),
  cancelDeleteAccountBtn: document.getElementById('cancelDeleteAccountBtn'),
  confirmDeleteAccountBtn: document.getElementById('confirmDeleteAccountBtn'),
  deleteAccountError: document.getElementById('deleteAccountError'),
  oldPasswordInput: document.getElementById('oldPassword'),
  newPasswordInput: document.getElementById('newPassword'),
  confirmPasswordInput: document.getElementById('confirmPassword'),
  passwordError: document.getElementById('passwordError'),
  newUsernameInput: document.getElementById('newUsername'),
  usernameError: document.getElementById('usernameError'),
  cancelPasswordBtn: document.getElementById('cancelPasswordBtn'),
  savePasswordBtn: document.getElementById('savePasswordBtn'),
  cancelUsernameBtn: document.getElementById('cancelUsernameBtn'),
  saveUsernameBtn: document.getElementById('saveUsernameBtn')
};