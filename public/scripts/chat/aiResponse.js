import { authToken, state, DOM } from './config.js';
import { showInfoModal } from './modals.js';
import { updateReasoning, updateContent } from './streamHandlers.js';
import { createStreamingAssistantContainer, appendMessageToDOM } from './messageRenderer.js';
import { loadChats, openChat } from './chatManagement.js';
import { clearDraftForChat } from './draft.js';

let titleUpdateScheduled = false;

export const generateNewResponse = async (userMessage) => {
  const { reasoningBlock, contentBlock } = createStreamingAssistantContainer();
  state.streamingData.reasoningDiv = reasoningBlock;
  state.streamingData.contentDiv = contentBlock;
  state.streaming = true;
  DOM.sendBtn.disabled = true;
  DOM.stopBtn.style.display = 'inline-block';

  const reasoningEffort = DOM.reasoningSelect.value;
  state.streamingData.abortController = new AbortController();

  const chatBefore = state.chats.find(c => c.id === state.currentChatId);
  const isFirstMessage = chatBefore && (!chatBefore.messages || chatBefore.messages.length === 0);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },

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

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { 
        stream: true 
      });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'reasoning') {
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

    // Обновление списка чатов
    await loadChats();

    const updatedChat = state.chats.find(c => c.id === state.currentChatId);

    if (updatedChat && DOM.currentChatTitle.textContent !== updatedChat.title) {
      DOM.currentChatTitle.textContent = updatedChat.title;
    }

    if (isFirstMessage && !titleUpdateScheduled) {
      titleUpdateScheduled = true;
      setTimeout(async () => {
        await loadChats();
        await openChat(state.currentChatId);
        titleUpdateScheduled = false;
      }, 5000);
    }

  } catch (err) {
    if (err.name !== 'AbortError') {
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

  if (!text || state.streaming) {
    return;
  }

  DOM.userInput.value = '';

  clearDraftForChat();

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