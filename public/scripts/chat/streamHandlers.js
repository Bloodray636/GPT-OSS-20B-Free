import { state, DOM } from './config.js';
import { escapeHtml, scrollToBottom } from './utils.js';
import { attachCopyToCodeBlocks } from './copyCode.js';

export const updateReasoning = (text) => {
  if (state.streamingData.reasoningDiv) {
    const reasoningDiv = state.streamingData.reasoningDiv;

    if (!reasoningDiv.parentElement.classList?.contains('reasoning-wrapper')) {
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
      label.textContent = '🧠 Рассуждения';
      header.appendChild(toggleIcon);
      header.appendChild(label);

      reasoningDiv.classList.add('reasoning-block');
      reasoningDiv.classList.remove('expanded'); // свёрнут по умолчанию
      reasoningDiv.style.maxHeight = '0';

      wrapper.appendChild(header);
      wrapper.appendChild(reasoningDiv);
      reasoningDiv.parentNode.replaceChild(wrapper, reasoningDiv);
      state.streamingData.reasoningDiv = reasoningDiv;

      header.addEventListener('click', () => {
        const isCollapsed = header.dataset.collapsed === 'true';

        if (isCollapsed) {
          reasoningDiv.classList.add('expanded');
          header.dataset.collapsed = 'false';
          toggleIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-6 7-7-6"/>
            </svg>
          `;
        } else {
          reasoningDiv.classList.remove('expanded');
          header.dataset.collapsed = 'true';
          toggleIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l6 7-6 7"/>
            </svg>
          `;
        }
      });
    }

    reasoningDiv.innerHTML += escapeHtml(text);
    
    scrollToBottom();
  }
};

export const updateContent = (text) => {
  if (state.streamingData.contentDiv) {
    if (!state.streamingData.contentDiv.dataset.raw) {
      state.streamingData.contentDiv.dataset.raw = '';
    }

    state.streamingData.contentDiv.dataset.raw += text;

    const rendered = marked.parse(state.streamingData.contentDiv.dataset.raw, { 
        async: false 
    });
    
    state.streamingData.contentDiv.innerHTML = rendered;

    scrollToBottom();
  }
};