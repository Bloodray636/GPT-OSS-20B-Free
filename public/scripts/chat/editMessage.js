import { authToken, state, DOM } from './config.js';
import { showInfoModal } from './modals.js';
import { appendMessageToDOM } from './messageRenderer.js';
import { generateNewResponse } from './aiResponse.js';
import { loadChats } from './chatManagement.js';

export const applyEditMessage = async (messageDiv, newText) => {
  if (state.streaming) {
    showInfoModal('Внимание', 'Дождитесь окончания ответа');
    return;
  }

  const allMessages = Array.from(DOM.chatContainer.querySelectorAll('.message'));
  const index = allMessages.indexOf(messageDiv);

  if (index === -1) {
    return;
  }

  const truncateRes = await fetch(`/api/chats/${state.currentChatId}/truncate`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json', 
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) 
    },
    body: JSON.stringify({ 
        keepIndex: index - 1 
    })
  });

  if (!truncateRes.ok) {
    showInfoModal('Ошибка', 'Не удалось обновить историю');
    return;
  }

  for (let i = index; i < allMessages.length; i++) {
    allMessages[i].remove();
  }

  await appendMessageToDOM('user', newText);
  await generateNewResponse(newText);
  await loadChats();

  if (state.modals) {
    state.modals.editMessageIndex = -1;
  }
};