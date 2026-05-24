import { DOM } from './config.js';

export const scrollToBottom = () => {
  DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
};