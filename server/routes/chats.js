import express from 'express';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';

import {
  createChatSchema,
  renameChatSchema,
  truncateChatSchema,
  updateMessageSchema,
  chatIdParamSchema,
  messageIndexParamSchema,
} from '../validation/schemas.js';

import { 
  getChats, 
  getChatById, 
  saveChat, 
  deleteChat 
} from '../db.js';

import { supabase } from '../config.js';

const router = express.Router();

const setNoCacheHeaders = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
};


router.get('/', authenticate, async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const chats = await getChats(req.user.id);
    res.json(chats);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.post('/', authenticate, validate(createChatSchema), async (req, res) => {
  const newChat = {
    id: Date.now().toString(),
    title: 'Новый чат',
    createdAt: new Date().toISOString(),
    messages: [],
  };

  try {
    await saveChat(
      newChat, 
      req.user.id
    );

    res.json(newChat);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.delete('/all', authenticate, async (req, res) => {
  try {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.delete('/:chatId', authenticate, validate(chatIdParamSchema, 'params'), async (req, res) => {
  try {
    await deleteChat(
      req.params.chatId, 
      req.user.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.put('/:chatId', authenticate, validate(chatIdParamSchema, 'params'), validate(renameChatSchema), async (req, res) => {
  const { title } = req.body;

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', req.params.chatId)
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }

  res.json({ success: true });
});

router.put('/:chatId/truncate', authenticate, validate(chatIdParamSchema, 'params'), validate(truncateChatSchema), async (req, res) => {
  const { keepIndex } = req.body;

  try {
    const chat = await getChatById(
      req.params.chatId, 
      req.user.id
    );

    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found' 
      });
    }

    if (keepIndex === -1) {
      chat.messages = [];
    } else if (keepIndex >= 0 && keepIndex < chat.messages.length) {
      chat.messages = chat.messages.slice(0, keepIndex + 1);
    } else {
      return res.status(400).json({ 
        error: 'Invalid keepIndex' 
      });
    }

    await saveChat(
      chat, 
      req.user.id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.put('/:chatId/messages/:messageIndex', authenticate, validate(chatIdParamSchema, 'params'), validate(messageIndexParamSchema, 'params'), validate(updateMessageSchema), async (req, res) => {
  const { chatId, messageIndex } = req.params;
  const { content } = req.body;
  const idx = parseInt(messageIndex, 10);

  try {
    const chat = await getChatById(chatId, req.user.id);

    if (!chat) return res.status(404).json({ 
      error: 'Chat not found' 
    });

    if (idx < 0 || idx >= chat.messages.length) {
      return res.status(400).json({ 
        error: 'Invalid message index' 
      });
    }

    if (chat.messages[idx].role !== 'user') {
      return res.status(400).json({ 
        error: 'Not a user message' 
      });
    }

    chat.messages[idx].content = content;
    chat.messages = chat.messages.slice(0, idx + 1);

    await saveChat(chat, req.user.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.get('/:chatId', authenticate, validate(chatIdParamSchema, 'params'), async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const chat = await getChatById(
      req.params.chatId, 
      req.user.id
    );

    if (!chat) {
      return res.status(404).json({ 
        error: 'Chat not found' 
      });
    } 

    res.json(chat);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

export default router;