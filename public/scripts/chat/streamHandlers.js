import { state, DOM } from './config.js';
import { escapeHtml, scrollToBottom } from './utils.js';
import { attachCopyToCodeBlocks } from './copyCode.js';

export const updateReasoning = (text) => {
  if (state.streamingData.reasoningDiv) {
    if (!state.streamingData.reasoningDiv.parentElement.querySelector('.reasoning-header')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'reasoning-wrapper';

      const header = document.createElement('div');
      header.className = 'reasoning-header';
      header.dataset.collapsed = 'true';
      header.innerHTML = '<span class="reasoning-toggle">▶</span> <span class="reasoning-label">🧠 Рассуждения</span>';

      const block = state.streamingData.reasoningDiv;
      block.classList.add('reasoning-block');
      block.style.display = 'none';
      wrapper.appendChild(header);
      wrapper.appendChild(block);
      state.streamingData.reasoningDiv.parentNode.replaceChild(wrapper, block);
      state.streamingData.reasoningDiv = block;
      
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

    state.streamingData.reasoningDiv.innerHTML += escapeHtml(text);
    
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