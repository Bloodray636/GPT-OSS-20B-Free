import express from 'express';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';
import { sendMessageSchema } from '../validation/schemas.js';
import { getUserSettings } from '../db.js';
import { streamAIResponse } from '../services/aiService.js';
import { getOrCreateChat, addUserMessage, addAssistantMessage, compressChatIfNeeded } from '../services/chatStorage.js';
import { getChatSummaries } from '../db.js';
import { saveChat } from '../db.js';

const router = express.Router();

router.post('/', authenticate, validate(sendMessageSchema), async (req, res) => {
  const { chatId, newMessage, reasoning_effort } = req.body;

  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;

  let chat = await getOrCreateChat(chatId, req.user.id);

  // Суммаризация
  await compressChatIfNeeded(chat, req.user.id);

  if (shouldSave) {
    addUserMessage(chat, newMessage);
  }

  // Формирование сообщений
  const summaries = await getChatSummaries(chat.id, 2);
  let systemPrompt = '';
  if (summaries.length) {
    systemPrompt = `Краткое содержание предыдущих частей диалога:\n${summaries.join('\n---\n')}\n\n`;
  }

  const openAiMessages = [];

  if (systemPrompt) {
    openAiMessages.push({ 
      role: 'system', 
      content: systemPrompt 
    });
  }

  // Добавление всех сообщений чата
  openAiMessages.push(...chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  })));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const abortController = new AbortController();
  let streamStarted = false;

  const onClose = () => {
    if (!res.headersSent && !abortController.signal.aborted && streamStarted) {
      abortController.abort();
    }
  };

  req.on('close', onClose);

  try {
    let assistantContent = '';
    let assistantReasoning = '';

    const userId = req.user.id;

    for await (const { reasoning, content } of streamAIResponse(openAiMessages, reasoning_effort, abortController.signal, userId)) {
      if (!streamStarted){
        streamStarted = true;
      }

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

    if (shouldSave) {
      addAssistantMessage(chat, assistantContent, assistantReasoning);
      await saveChat(chat, req.user.id);
    }
  } catch (err) {
    if (err.name === 'AbortError') {

      if (!res.headersSent && !res.destroyed){
        res.end();
      }

      return;
    }

    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  } finally {
    req.removeListener('close', onClose);
  }
});

export default router;