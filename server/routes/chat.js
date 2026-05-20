import express from 'express';
import { authenticate } from '../middleware.js';
import { getUserSettings } from '../db.js';
import { streamAIResponse } from '../services/aiService.js';
import { getOrCreateChat, addUserMessage, addAssistantMessage } from '../services/chatStorage.js';
import { saveChat } from '../db.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;

  if (!chatId || !newMessage) {
    return res.status(400).json({ error: 'chatId and newMessage required' });
  }

  // Настройки пользователя
  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;

  // Создание чата
  let chat = await getOrCreateChat(chatId, req.user.id);

  if (shouldSave) {
    addUserMessage(chat, newMessage);
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

    // Генерирация ответа
    for await (const { reasoning, content } of streamAIResponse(openAiMessages, reasoning_effort)) {
      if (reasoning) {
        assistantReasoning += reasoning;

        res.write(`data: ${JSON.stringify({ 
          type: 'reasoning',
           text: reasoning 
        })}\n\n`);
      }

      if (content) {
        assistantContent += content;
        
        res.write(`data: ${JSON.stringify({ 
          type: 'content', 
          text: content 
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

    // Сохранение ответа
    if (shouldSave) {
      addAssistantMessage(chat, assistantContent, assistantReasoning);
      await saveChat(chat, req.user.id);
    }

  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    }
  }
});

export default router;