import { DOM } from './config.js';
import { createNewChat } from './chatManagement.js';
import { sendMessage, stopGeneration } from './messageHandlers.js';

export const initEventListeners = () => {
  DOM.newChatBtn?.addEventListener('click', createNewChat);
  DOM.sendBtn?.addEventListener('click', sendMessage);
  DOM.stopBtn?.addEventListener('click', stopGeneration);

  DOM.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
};