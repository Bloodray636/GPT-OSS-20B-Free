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
      navigator.clipboard.writeText(content).then(() => showInfoModal('Успех', 'Сообщение скопировано'))
        .catch(() => showInfoModal('Ошибка', 'Не удалось скопировать сообщение'));
    });

    const editIcon = userDiv.querySelector('.edit-icon');
    editIcon.addEventListener('click', () => showEditModal(userDiv, content));
  } 
  else if (role === 'assistant') {
    const assistantDiv = document.createElement('div');
    assistantDiv.className = 'message assistant';

    if (reasoning) {
      const wrapper = document.createElement('div');
      wrapper.className = 'reasoning-wrapper';

      const header = document.createElement('div');
      header.className = 'reasoning-header';
      header.dataset.collapsed = 'true';

      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'reasoning-toggle';
      toggleIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l6 7-6 7"/>
        </svg>
      `;

      const label = document.createElement('span');
      label.className = 'reasoning-label';
      label.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4.5a3 3 0 0 0-2.567 4.554a3.001 3.001 0 0 0 0 5.893M7 4.5a2.5 2.5 0 0 1 5 0v15a2.5 2.5 0 0 1-5 0a3 3 0 0 1-2.567-4.553M7 4.5c0 .818.393 1.544 1 2m-3.567 8.447A3 3 0 0 1 6 13.67m11 5.83a3 3 0 0 0 2.567-4.554a3.001 3.001 0 0 0 0-5.893M17 19.5a2.5 2.5 0 0 1-5 0v-15a2.5 2.5 0 0 1 5 0a3 3 0 0 1 2.567 4.553M17 19.5c0-.818-.393-1.544-1-2m3.567-8.447A3 3 0 0 1 18 10.33"/>
        </svg>
        Рассуждения
      `;

      header.appendChild(toggleIcon);
      header.appendChild(label);

      const block = document.createElement('div');
      block.className = 'reasoning-block';
      block.innerText = reasoning;

      wrapper.appendChild(header);
      wrapper.appendChild(block);
      assistantDiv.appendChild(wrapper);

      header.addEventListener('click', () => {
        const isCollapsed = header.dataset.collapsed === 'true';

        if (isCollapsed) {
          block.classList.add('expanded');
          header.dataset.collapsed = 'false';
          toggleIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-6 7-7-6"/>
            </svg>
          `;
        } else {
          block.classList.remove('expanded');
          header.dataset.collapsed = 'true';
          toggleIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l6 7-6 7"/>
            </svg>
          `;
        }
      });
    }

    const contentBlock = document.createElement('div');
    contentBlock.className = 'content-block';

    const formatted = typeof marked !== 'undefined' ? marked.parse(content, { async: false }) : escapeHtml(content);
    contentBlock.innerHTML = formatted;
    assistantDiv.appendChild(contentBlock);

    const copyBtn = document.createElement('div');
    copyBtn.className = 'copy-response-btn';
    copyBtn.title = 'Копировать';
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2m0 16H8V7h11z"/>
      </svg>
    `;

    assistantDiv.appendChild(copyBtn);

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => showInfoModal('Успех', 'Ответ скопирован'))
        .catch(() => showInfoModal('Ошибка', 'Не удалось скопировать ответ'));
    });

    DOM.chatContainer.appendChild(assistantDiv);

    attachCopyToCodeBlocks(assistantDiv);
  }

  scrollToBottom();
};

export const createStreamingAssistantContainer = () => {
  const assistantDiv = document.createElement('div');
  assistantDiv.className = 'message assistant';

  const wrapper = document.createElement('div');
  wrapper.className = 'reasoning-wrapper';

  const header = document.createElement('div');
  header.className = 'reasoning-header';
  header.dataset.collapsed = 'true';

  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'reasoning-toggle';
  toggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
    <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l6 7-6 7"/>
  </svg>`;

  const label = document.createElement('span');
  label.className = 'reasoning-label';
  label.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 4.5a3 3 0 0 0-2.567 4.554a3.001 3.001 0 0 0 0 5.893M7 4.5a2.5 2.5 0 0 1 5 0v15a2.5 2.5 0 0 1-5 0a3 3 0 0 1-2.567-4.553M7 4.5c0 .818.393 1.544 1 2m-3.567 8.447A3 3 0 0 1 6 13.67m11 5.83a3 3 0 0 0 2.567-4.554a3.001 3.001 0 0 0 0-5.893M17 19.5a2.5 2.5 0 0 1-5 0v-15a2.5 2.5 0 0 1 5 0a3 3 0 0 1 2.567 4.553M17 19.5c0-.818-.393-1.544-1-2m3.567-8.447A3 3 0 0 1 18 10.33"/>
    </svg>
    Рассуждения
  `;

  header.appendChild(toggleIcon);
  header.appendChild(label);

  const reasoningBlock = document.createElement('div');
  reasoningBlock.className = 'reasoning-block';
  reasoningBlock.style.maxHeight = '0';

  wrapper.appendChild(header);
  wrapper.appendChild(reasoningBlock);
  assistantDiv.appendChild(wrapper);

  const contentBlock = document.createElement('div');
  contentBlock.className = 'content-block';
  contentBlock.dataset.raw = '';
  assistantDiv.appendChild(contentBlock);

  DOM.chatContainer.appendChild(assistantDiv);
  scrollToBottom();

  header.addEventListener('click', () => {
    const isCollapsed = header.dataset.collapsed === 'true';
    if (isCollapsed) {
      reasoningBlock.classList.add('expanded');
      reasoningBlock.style.maxHeight = 'none';
      header.dataset.collapsed = 'false';
      toggleIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-6 7-7-6"/>
        </svg>
      `;
    } else {
      reasoningBlock.classList.remove('expanded');
      reasoningBlock.style.maxHeight = '0';
      header.dataset.collapsed = 'true';
      toggleIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l6 7-6 7"/>
        </svg>
      `;
    }
  });

  return { reasoningBlock, contentBlock };
};