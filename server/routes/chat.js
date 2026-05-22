import express from 'express';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';
import { sendMessageSchema } from '../validation/schemas.js';
import { getUserSettings } from '../db.js';
import { streamAIResponse } from '../services/aiService.js';
import { getOrCreateChat, addUserMessage, addAssistantMessage } from '../services/chatStorage.js';
import { saveChat } from '../db.js';

const router = express.Router();

router.post('/', authenticate, validate(sendMessageSchema), async (req, res) => {
  const { chatId, newMessage, reasoning_effort } = req.body;

  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;

  let chat = await getOrCreateChat(chatId, req.user.id);

  if (shouldSave) {
    addUserMessage(chat, newMessage);
  }

  const openAiMessages = chat.messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const abortController = new AbortController();
  let streamStarted = false;

  const onClose = () => {
    if (!res.headersSent && !abortController.signal.aborted && streamStarted) {
      abortController.abort();
      console.log('Client disconnected after stream started, aborting OpenAI request');
    }
  };

  req.on('close', onClose);

  try {
    let assistantContent = '';
    let assistantReasoning = '';

    const userId = req.user.id;

    for await (const { reasoning, content } of streamAIResponse(openAiMessages, reasoning_effort, abortController.signal, userId)) {
      if (!streamStarted) streamStarted = true;

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
      console.log(`Saving: content length=${assistantContent.length}, reasoning length=${assistantReasoning.length}`);
      addAssistantMessage(chat, assistantContent, assistantReasoning);
      await saveChat(chat, req.user.id);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Stream aborted by client');

      if (!res.headersSent && !res.destroyed){
        res.end();
      }

      return;
    }

    
    console.error('Stream error:', err);
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