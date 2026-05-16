import { authToken, state, DOM } from './config.js';
import { escapeHtml, scrollToBottom, fetchJSON } from './utils.js';
import { showInfoModal, showEditModal } from './modals.js';
import { loadChats } from './chatManagement.js';

// Вспомогательная для копирования кода (использует showInfoModal)
const attachCopyToCodeBlocks = (container) => {
  if (!container) return;

  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy-code-btn')){
      return;
    }

    const copyBtn = document.createElement('div');
    copyBtn.className = 'copy-code-btn';
    copyBtn.innerHTML = 'Копировать';
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

export const appendMessageToDOM = async (role, content, reasoning = null) => {
  if (role === 'user') {
    const userDiv = document.createElement('div');
    userDiv.className = 'message user';

    userDiv.innerHTML = `
      <div class="bubble">${escapeHtml(content)}</div>
      <div class="copy-user-btn" title="Копировать">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/>
        </svg>
      </div>
      <span class="edit-icon" title="Редактировать">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="m21.71 4.72l-2.43-2.43a1 1 0 0 0-1.41 0l-5.58 5.58a1 1 0 0 0-.29.71V11a1 1 0 0 0 1 1h2.42a1 1 0 0 0 .71-.29l5.58-5.58a1 1 0 0 0 0-1.41M15 10h-1V9l4.58-4.58l1 1Zm4 2a1 1 0 0 0-1 1a7 7 0 0 1-7 7H5.41l.64-.63a1 1 0 0 0 0-1.42A7 7 0 0 1 11 6a1 1 0 0 0 0-2a9 9 0 0 0-7 14.62l-1.71 1.67a1 1 0 0 0-.21 1.09A1 1 0 0 0 3 22h8a9 9 0 0 0 9-9a1 1 0 0 0-1-1"/>
        </svg>
      </span>
    `;

    DOM.chatContainer.appendChild(userDiv);

    const copyBtn = userDiv.querySelector('.copy-user-btn');
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        showInfoModal('Успех', 'Сообщение скопировано');
      }).catch(() => showInfoModal('Ошибка', 'Не удалось скопировать сообщение'));
    });

    userDiv.querySelector('.edit-icon').addEventListener('click', () => {
      showEditModal(userDiv, content)
    });
  } else if (role === 'assistant') {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';

    const formatted = typeof marked !== 'undefined' ? marked.parse(content, { async: false }) : escapeHtml(content);
    const reasoningHtml = reasoning ? `<div class="reasoning-block">${escapeHtml(reasoning)}</div>` : '';

    assistantDiv.innerHTML = `
      ${reasoningHtml}
      <div class="content-block">${formatted}</div>
      <div class="copy-response-btn" title="Копировать">
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

export const createStreamingAssistantContainer = () => {
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

export const updateReasoning = (text) => {
  if (state.streamingData.reasoningDiv) {
    state.streamingData.reasoningDiv.innerHTML += escapeHtml(text);
    state.streamingData.reasoningDiv.style.display = 'block';
    scrollToBottom();
  }
};

export const updateContent = (text) => {
  if (state.streamingData.contentDiv) {
    if (!state.streamingData.contentDiv.dataset.raw){
      state.streamingData.contentDiv.dataset.raw = '';
    }

    state.streamingData.contentDiv.dataset.raw += text;
    
    const raw = state.streamingData.contentDiv.dataset.raw.replace(/!\[.*?\]\(data:image\/[^)]+\)/g, '[Изображение не поддерживается]');
    state.streamingData.contentDiv.innerHTML = marked.parse(raw, { async: false });
    attachCopyToCodeBlocks(state.streamingData.contentDiv);

    scrollToBottom();
  }
};

export const applyEditMessage = async (messageDiv, newText) => {
  if (state.streaming) {
    showInfoModal('Внимание', 'Дождитесь окончания ответа');
    return;
  }

  const allMessages = Array.from(DOM.chatContainer.querySelectorAll('.message'));
  const index = allMessages.indexOf(messageDiv);
  
  if (index === -1) return;

  const res = await fetch(`/api/chats/${state.currentChatId}/messages/${index}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json', 
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) 
    },
    body: JSON.stringify({ content: newText })
  });

  if (!res.ok) {
    showInfoModal('Ошибка', 'Не удалось обновить сообщение');
    return;
  }

  for (let i = index; i < allMessages.length; i++) {
    allMessages[i].remove();
  }

  await appendMessageToDOM('user', newText);
  await generateNewResponse(newText);
  await loadChats();

  const freshChat = state.chats.find(c => c.id === state.currentChatId);

  if (freshChat) {
    DOM.chatContainer.innerHTML = '';

    for (const msg of freshChat.messages) {
      await appendMessageToDOM(msg.role, msg.content, msg.reasoning);
    }

    scrollToBottom();
  }
};

export const generateNewResponse = async (userMessage) => {
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
            if (data.type === 'reasoning'){
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

    if (updatedChat && DOM.currentChatTitle.textContent !== updatedChat.title) {
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

export const sendMessage = async () => {
  const text = DOM.userInput.value.trim();

  if (!text || state.streaming) return;

  DOM.userInput.value = '';

  await appendMessageToDOM('user', text);
  await generateNewResponse(text);
};

export const stopGeneration = () => {
  if (state.streamingData.abortController) {
    state.streamingData.abortController.abort();

    updateContent('(генерация остановлена)');
    
    state.streaming = false;
    DOM.sendBtn.disabled = false;
    DOM.stopBtn.style.display = 'none';
  }
};