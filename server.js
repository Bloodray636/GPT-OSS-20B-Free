import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import OpenAI from 'openai';

// Инициализация
const app = express();

// Конфигурация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 120000,
});

app.use(express.json());
app.use(express.static('public'));

// Утилиты
const isValidUsername = (username) => username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
const isValidEmail = (email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => password && password.length >= 6;

// Аутентификация
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or invalid token'
    });
  }

  const token = authHeader.split(' ')[1];

  const {
    data: {
      user
    }, error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

// БД
const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, save_history')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return {
    theme: data?.theme || 'dark',
    saveHistory: data?.save_history !== false
  };
};

const saveUserSettings = async (userId, theme, saveHistory) => {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      theme,
      save_history: saveHistory
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    throw error;
  }
};

const getChats = async (userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('updated_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return data;
};

const getChatById = async (chatId, userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, reasoning, created_at')
    .eq('chat_id', chatId)
    .order('created_at', {
      ascending: true
    });

  data.messages = messages || [];

  return data;
};

const saveChat = async (chat, userId) => {
  await supabase
    .from('chats')
    .upsert(
      {
        id: chat.id,
        user_id: userId,
        title: chat.title,
        created_at: chat.createdAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  await supabase.from('messages').delete().eq('chat_id', chat.id);

  if (chat.messages?.length) {
    const messagesToInsert = chat.messages.map(msg => ({
      chat_id: chat.id,
      role: msg.role,
      content: msg.content,
      reasoning: msg.reasoning || null,
    }));

    await supabase.from('messages').insert(messagesToInsert);
  }
};

const deleteChat = async (chatId, userId) => {
  await supabase.from('chats').delete().eq('id', chatId).eq('user_id', userId);
};

// API
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password too short (min 6)' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        const {
          data: signData,
          error: signError
        } = await supabase.auth.signInWithPassword({ email, password });

        if (signError) {
          return res.status(409).json({ error: 'User exists but wrong credentials' });
        }

        return res.json({ success: true, token: signData.session?.access_token });
      }

      throw error;
    }

    const userId = data.user.id;

    // Настройки по умолчанию (не критично)
    await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        theme: 'dark',
        save_history: true
      },
      { onConflict: 'user_id' }
    ).catch(() => null);

    const { data: signData, error: signError } = await supabase.auth.signInWithPassword({ email, password });

    if (signError) {
      return res.json({ success: true });
    }

    return res.json({ success: true, token: signData.session?.access_token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ success: true, token: data.session?.access_token });
});

app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

app.get('/api/auth/status', authenticate, (req, res) => {
  res.json({ authenticated: true, username: req.user.email?.split('@')[0] });
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'Invalid password (min 6 characters)' });
  }

  const { error: signError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: oldPassword,
  });

  if (signError) {
    return res.status(401).json({ error: 'Old password incorrect' });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.post('/api/auth/change-username', authenticate, async (req, res) => {
  const { newUsername } = req.body;

  if (!isValidUsername(newUsername)) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', newUsername)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Username taken' });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', req.user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true, newUsername });
});

app.delete('/api/auth/delete-account', authenticate, async (req, res) => {
  const { password } = req.body;

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' });
  }

  const { error: signError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password,
  });

  if (signError) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  await supabase.from('profiles').delete().eq('id', req.user.id);
  await supabaseAdmin.auth.admin.deleteUser(req.user.id);

  res.json({ success: true });
});

// Настройки
app.get('/api/settings', authenticate, async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.id);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', authenticate, async (req, res) => {
  const { theme, saveHistory } = req.body;

  try {
    await saveUserSettings(req.user.id, theme, saveHistory);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Чаты
app.get('/api/chats', authenticate, async (req, res) => {
  try {
    const chats = await getChats(req.user.id);
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats', authenticate, async (req, res) => {
  const newChat = {
    id: Date.now().toString(),
    title: 'Новый чат',
    createdAt: new Date().toISOString(),
    messages: [],
  };

  try {
    await saveChat(newChat, req.user.id);
    res.json(newChat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:chatId', authenticate, async (req, res) => {
  try {
    await deleteChat(req.params.chatId, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chats/:chatId', authenticate, async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', req.params.chatId)
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.put('/api/chats/:chatId/truncate', authenticate, async (req, res) => {
  const { keepIndex } = req.body;

  if (typeof keepIndex !== 'number') {
    return res.status(400).json({ error: 'keepIndex required' });
  }

  try {
    const chat = await getChatById(req.params.chatId, req.user.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (keepIndex === -1) {
      chat.messages = [];
    } else if (keepIndex >= 0 && keepIndex < chat.messages.length) {
      chat.messages = chat.messages.slice(0, keepIndex + 1);
    } else {
      return res.status(400).json({ error: 'Invalid keepIndex' });
    }

    await saveChat(chat, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:chatId', authenticate, async (req, res) => {
  try {
    const chat = await getChatById(req.params.chatId, req.user.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/all', authenticate, async (req, res) => {
  try {
    const { error } = await supabase.from('chats').delete().eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Аватары
app.post('/api/user/avatar', authenticate, async (req, res) => {
  const { avatarUrl } = req.body;

  if (!avatarUrl) {
    return res.status(400).json({ error: 'No avatar URL' });
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/avatar', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', req.user.id)
      .single();

    if (data?.avatar_url) {
      res.json({ url: data.avatar_url });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

// Рассуждения
app.post('/api/chat', authenticate, async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;

  if (!chatId || !newMessage) {
    return res.status(400).json({ error: 'chatId and newMessage required' });
  }

  const settings = await getUserSettings(req.user.id);
  const shouldSave = settings.saveHistory;
  let chat = await getChatById(chatId, req.user.id);

  if (!chat) {
    chat = {
      id: chatId,
      title: 'Новый чат',
      createdAt: new Date().toISOString(),
      messages: []
    };
  }

  if (shouldSave) {
    chat.messages.push({ role: 'user', content: newMessage });
  }

  const openAiMessages = chat.messages.map(msg => ({ role: msg.role, content: msg.content }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: openAiMessages,
      temperature: 1,
      top_p: 1,
      max_tokens: 4096,
      stream: true,
      extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort } },
    });

    let assistantContent = '', assistantReasoning = '';

    for await (const chunk of completion) {
      const reasoning = chunk.choices[0]?.delta?.reasoning || chunk.choices[0]?.delta?.reasoning_content;
      const content = chunk.choices[0]?.delta?.content || '';

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
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    }
  }
});

export default app;