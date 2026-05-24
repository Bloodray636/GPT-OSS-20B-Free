import { state, DOM } from './config.js';
import { escapeHtml, scrollToBottom } from './utils.js';
import { attachCopyToCodeBlocks } from './copyCode.js';

export const updateReasoning = (text) => {
  if (state.streamingData.reasoningDiv) {
    state.streamingData.reasoningDiv.innerHTML += escapeHtml(text);
    state.streamingData.reasoningDiv.style.display = 'block';
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