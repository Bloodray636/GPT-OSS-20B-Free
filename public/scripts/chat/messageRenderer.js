import { DOM } from './config.js';
import { escapeHtml, scrollToBottom } from './utils.js';
import { showEditModal, showInfoModal } from './modals.js';
import { attachCopyToCodeBlocks } from './copyCode.js';

export const appendMessageToDOM = async (role, content, reasoning = null, msgIndex = -1) => {
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

    const editIcon = userDiv.querySelector('.edit-icon');
    editIcon.addEventListener('click', () => showEditModal(userDiv, content));
  } else if (role === 'assistant') {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';

    const formatted = typeof marked !== 'undefined' ? marked.parse(content, { async: false }) : escapeHtml(content);
    const reasoningHtml = reasoning ? `
      <div class="reasoning-wrapper">
        <div class="reasoning-header" data-collapsed="true">
          <span class="reasoning-toggle">▶</span> <span class="reasoning-label">🧠 Рассуждения</span>
        </div>
        <div class="reasoning-block" style="display: none;">${escapeHtml(reasoning)}</div>
      </div>
    ` : '';

    assistantDiv.innerHTML = `
      ${reasoningHtml}
      <div class="content-block">${formatted}</div>
      <div class="copy-response-btn" title="Копировать">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/>
        </svg>
      </div>
    `;

    if (reasoning) {
      const header = assistantDiv.querySelector('.reasoning-header');
      const block = assistantDiv.querySelector('.reasoning-block');
      
      header.addEventListener('click', () => {
        const isCollapsed = header.dataset.collapsed === 'true';
        if (isCollapsed) {
          block.style.display = 'block';
          header.dataset.collapsed = 'false';
          header.querySelector('.reasoning-toggle').textContent = '▼';
        } else {
          block.style.display = 'none';
          header.dataset.collapsed = 'true';
          header.querySelector('.reasoning-toggle').textContent = '▶';
        }
      });
    }

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