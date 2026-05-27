import { getChatById, saveChat, saveChatSummary } from '../db.js';
import { generateSummary, estimateTokens } from '../summarizer.js';
import { TitleGenerator } from './titleGenerator.js';

const TOKEN_LIMIT = 10000;
const SUMMARY_TRIGGER = 8000;

export async function compressChatIfNeeded(chat, userId) {
  const messages = chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  let totalTokens = estimateTokens(messages);

  if (totalTokens <= SUMMARY_TRIGGER) {
    return null;
  }

  const splitIdx = Math.floor(messages.length * 0.7);
  const oldMessages = messages.slice(0, splitIdx);
  const recentMessages = messages.slice(splitIdx);

  const summary = await generateSummary(oldMessages);
  await saveChatSummary(chat.id, summary);

  const compressed = [
    { 
      role: 'system', 
      content: `Краткое содержание предыдущего диалога:\n${summary}` 
    },
    ...recentMessages,
  ];

  console.log(`[Summarizer] Чат ${chat.id}: сжатие выполнено, токенов было ${totalTokens}, стало ${estimateTokens(compressed)}`);

  return compressed;
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

export async function updateChatTitleIfNeeded(chat, firstUserMessage, userId) {
  if (chat.title !== 'Новый чат') {
    return false;
  }

  if (!firstUserMessage) {
    return false;
  }

  const titleGenerator = new TitleGenerator();
  let newTitle = null;

  try {
    newTitle = await titleGenerator.generateTitle(firstUserMessage);
  } catch (err) {
    console.error('Title generation error:', err);
  }

  if (!newTitle || newTitle.length < 3) {
    newTitle = titleGenerator.fallbackTitle(firstUserMessage);
  }

  if (newTitle && newTitle !== chat.title) {
    chat.title = newTitle;
    await saveChat(chat, userId);
    return true;
  }

  return false;
}