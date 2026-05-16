import express from 'express';
import { authenticate } from '../middleware.js';
import { getChats, getChatById, saveChat, deleteChat } from '../db.js';
import { supabase } from '../config.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const chats = await getChats(req.user.id);

    res.json(chats);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.post('/', authenticate, async (req, res) => {
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

router.delete('/:chatId', authenticate, async (req, res) => {
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

router.put('/:chatId', authenticate, async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ 
      error: 'Title required' 
    });
  }

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

router.put('/:chatId/truncate', authenticate, async (req, res) => {
  const { keepIndex } = req.body;

  if (typeof keepIndex !== 'number') {
    return res.status(400).json({ 
      error: 'keepIndex required' 
    });
  }

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

router.get('/:chatId', authenticate, async (req, res) => {
  res.setHeader(
    'Cache-Control', 
    'no-store, no-cache, must-revalidate, private'
  );
  
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

export default router;