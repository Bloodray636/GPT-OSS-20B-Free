import { getChatById, saveChat } from '../db.js';

export async function getOrCreateChat(chatId, userId) {
  let chat = await getChatById(chatId, userId);

  if (!chat) {
    chat = {
      id: chatId,
      title: 'Новый чат',
      createdAt: new Date().toISOString(),
      messages: [],
    };
  }

  return chat;
}

export function addUserMessage(chat, content) {
  chat.messages.push({ role: 'user', content });
}

export function addAssistantMessage(chat, assistantContent, assistantReasoning) {
  console.log(`addAssistantMessage called with reasoning length: ${assistantReasoning.length}`);
  chat.messages.push({
    role: 'assistant',
    content: assistantContent,
    reasoning: assistantReasoning,    // явное поле
  });

  if (chat.title === 'Новый чат' && assistantContent.length > 10) {
    chat.title = assistantContent.slice(0, 30) + (assistantContent.length > 30 ? '…' : '');
    return true;
  }

  return false;
}