import { state, DOM } from './config.js';

const getDraftKey = () => `chat_draft_${state.currentChatId}`;
let draftTimer = null;

const saveDraft = (text) => {
  const key = getDraftKey();

  if (text && text.trim()) {
    localStorage.setItem(key, text);
  } else {
    localStorage.removeItem(key);
  }
};

export const loadDraft = () => {
  const key = getDraftKey();
  return localStorage.getItem(key) || '';
};

export const clearDraftForChat = () => {
  const key = getDraftKey();
  localStorage.removeItem(key);
};

export const initDraft = () => {
  if (!DOM.userInput) {
    return;
  }

  DOM.userInput.value = loadDraft();
  DOM.userInput.addEventListener('input', () => {
    if (draftTimer) {
        clearTimeout(draftTimer);
    }
    
    draftTimer = setTimeout(() => saveDraft(DOM.userInput.value), 500);
  });
};