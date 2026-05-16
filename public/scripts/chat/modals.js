import { DOM, state } from './config.js';
import { applyEditMessage } from './messageHandlers.js';
import { renameChatById } from './chatManagement.js';

export const closeAllModals = () => {
  const modals = [DOM.confirmModal, DOM.editModal, DOM.renameModal, DOM.infoModal];
  modals.forEach(modal => { 
    if (modal) {
      modal.style.display = 'none';
    }  
  });
};

export const showInfoModal = (title, message) => {
  DOM.infoTitle.textContent = title;
  DOM.infoMessage.textContent = message;
  DOM.infoModal.style.display = 'flex';
};

export const showConfirm = (title, message, onConfirm) => {
  DOM.confirmTitle.textContent = title;
  DOM.confirmMessage.textContent = message;
  DOM.confirmModal.style.display = 'flex';
  state.modals.confirmCallback = onConfirm;
};

export const showEditModal = (messageDiv, text, msgIndex) => { 
  state.modals.editMessageDiv = messageDiv;
  state.modals.editMessageIndex = msgIndex;
  DOM.editMessageText.value = text;
  DOM.editModal.style.display = 'flex';
  DOM.editMessageText.focus();
};

export const showRenameModal = (chatId, currentTitle) => {
  state.modals.renameChatId = chatId;
  DOM.renameChatInput.value = currentTitle;
  DOM.renameModal.style.display = 'flex';
  DOM.renameChatInput.focus();
};

export function initModals() {
  if (DOM.confirmYesBtn) {
    DOM.confirmYesBtn.onclick = () => {
      if (state.modals.confirmCallback){
        state.modals.confirmCallback();
      }

      closeAllModals();

      state.modals.confirmCallback = null;
    };
  }

  if (DOM.confirmNoBtn){
    DOM.confirmNoBtn.onclick = closeAllModals;
  }

  if (DOM.infoOkBtn){
    DOM.infoOkBtn.onclick = () => {
      DOM.infoModal.style.display = 'none';
    }
  }

  if (DOM.editCancelBtn){
    DOM.editCancelBtn.onclick = () => {
      DOM.editModal.style.display = 'none';
    }
  }

  if (DOM.editSaveBtn) {
    DOM.editSaveBtn.onclick = async () => {
      const newText = DOM.editMessageText.value.trim();

      if (!newText) return;

      closeAllModals();

      await applyEditMessage(state.modals.editMessageDiv, newText);

      state.modals.editMessageDiv = null;
    };
  }

  if (DOM.renameCancelBtn){
    DOM.renameCancelBtn.onclick = () => {
      DOM.renameModal.style.display = 'none';
    }
  }

  if (DOM.renameSaveBtn) {
    DOM.renameSaveBtn.onclick = async () => {
      const newTitle = DOM.renameChatInput.value.trim();

      if (newTitle && state.modals.renameChatId) {
        await renameChatById(state.modals.renameChatId, newTitle);
      }

      closeAllModals();
      
      state.modals.renameChatId = null;
    };
  }
}