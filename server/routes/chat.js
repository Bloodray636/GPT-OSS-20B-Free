import express from 'express';
import { authenticate } from '../middleware.js';
import { openai } from '../config.js';
import { getUserSettings, getChatById, saveChat } from '../db.js';

const router = express.Router();

const isSuspiciousContent = (text) => {
  if (!text) return false;

  if (/(\S)\1{20,}/.test(text)) {
    return true;
  }
  
  const repeatMatch = text.match(/(?:повтори|repeat|напиши|скажи|покажи)\s+(\d+)\s+раз/i);

  if (repeatMatch && parseInt(repeatMatch[1], 10) > 100) {
    return true;
  }

  const words = text.toLowerCase().split(/\s+/);

  const freq = {};

  for (const w of words) {
    if (w.length > 2) {
      freq[w] = (freq[w] || 0) + 1;
      if (freq[w] > 20) return true;
    }
  }
  
  const suspiciousMatches = (text.match(/﷽/g) || []).length;

  if (suspiciousMatches > 10) {
    return true;
  }
  
  return false;
};


router.post('/', authenticate, async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;

  if (!chatId || !newMessage) {
    return res.status(400).json({ 
      error: 'chatId and newMessage required' 
    });
  }

  if (isSuspiciousContent(newMessage)) {
    return res.status(400).json({ 
      error: 'Ваш запрос содержит подозрительные повторения и был отклонён.' 
    });
  }

  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;

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
    chat.messages.push({ 
      role: 'user', 
      content: newMessage 
    });
  }

  const openAiMessages = chat.messages.map(msg => ({ 
    role: msg.role, 
    content: msg.content 
  }));

  res.setHeader(
    'Content-Type', 
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control', 
    'no-cache'
  );

  res.setHeader(
    'Connection', 
    'keep-alive'
  );

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: openAiMessages,
      temperature: 1,
      top_p: 1,
      max_tokens: 4096,
      stream: true,
      extra_body: { 
        chat_template_kwargs: { 
          thinking: true, 
          reasoning_effort 
        } 
      },
    });

    let assistantContent = '', assistantReasoning = '';

    for await (const chunk of completion) {
      const reasoning = chunk.choices[0]?.delta?.reasoning || chunk.choices[0]?.delta?.reasoning_content;
      const content = chunk.choices[0]?.delta?.content || '';

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
      chat.messages.push({ 
        role: 'assistant', 
        content: assistantContent, 
        reasoning: assistantReasoning 
      });

      if (chat.title === 'Новый чат' && assistantContent.length > 10) {
        chat.title = assistantContent.slice(0, 30) + (assistantContent.length > 30 ? '…' : '');
      }

      await saveChat(chat, req.user.id);
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: err.message 
      })}\n\n`);
    }
  }
});

export default router;