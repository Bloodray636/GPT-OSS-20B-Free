import express from 'express';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';
import { sendMessageSchema } from '../validation/schemas.js';
import { getUserSettings, getChatById, saveChat } from '../db.js';
import { streamAIResponse } from '../services/aiService.js';

const router = express.Router();

router.post('/', authenticate, validate(sendMessageSchema), async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;

  // Настройки пользователя
  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;

  // Загружаем чат или создаём новый
  let chat = await getChatById(chatId, req.user.id);
  if (!chat) {
    chat = {
      id: chatId,
      title: 'Новый чат',
      createdAt: new Date().toISOString(),
      messages: [],
    };
  }

  if (shouldSave) {
    chat.messages.push({ role: 'user', content: newMessage });
  }

  const openAiMessages = chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  // SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let assistantContent = '';
    let assistantReasoning = '';

    for await (const { reasoning, content } of streamAIResponse(openAiMessages, reasoning_effort)) {
      if (reasoning) {
        assistantReasoning += reasoning;
        res.write(`data: ${JSON.stringify({ type: 'reasoning', text: reasoning })}\n\n`);
      }
      if (content) {
        assistantContent += content;
        res.write(`data: ${JSON.stringify({ type: 'content', text: content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    if (shouldSave) {
      chat.messages.push({ role: 'assistant', content: assistantContent, reasoning: assistantReasoning });
      if (chat.title === 'Новый чат' && assistantContent.length > 10) {
        chat.title = assistantContent.slice(0, 30) + (assistantContent.length > 30 ? '…' : '');
      }
      await saveChat(chat, req.user.id);
    }
  } catch (err) {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;