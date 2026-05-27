import { getChatById, saveChat, saveChatSummary } from '../db.js';
import { generateSummary, estimateTokens } from '../summarizer.js';

const TOKEN_LIMIT = 10000;
const SUMMARY_TRIGGER = 8000;

export async function compressChatIfNeeded(chat, userId) {
  const messages = chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  let totalTokens = estimateTokens(messages);

  if (totalTokens <= SUMMARY_TRIGGER) {
    return false;
  }

  const splitIdx = Math.floor(messages.length * 0.7);
  const oldMessages = messages.slice(0, splitIdx);
  const recentMessages = messages.slice(splitIdx);

  const summary = await generateSummary(oldMessages);
  await saveChatSummary(chat.id, summary);

  chat.messages = [
    { 
      role: 'system', 
      content: `Краткое содержание предыдущего диалога:\n${summary}` 
    },
    ...recentMessages,
  ];

  console.log(`[Summarizer] Чат ${chat.id}: сжатие выполнено, токенов было ${totalTokens}, стало ${estimateTokens(chat.messages)}`);

  return true;
}

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
  chat.messages.push({ 
    role: 'user', 
    content 
  });
}

export function addAssistantMessage(chat, assistantContent, assistantReasoning) {
  chat.messages.push({
    role: 'assistant',
    content: assistantContent,
    reasoning: assistantReasoning,
  });

  return false;
}