import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import multer from 'multer';

// Инициализация приложения
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Конфигурация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Конфигурация NVIDIA API
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'qwen/qwen3.5-397b-a17b';
const NVIDIA_INVOKE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Вспомогательные функции валидации
const isValidUsername = (username) => username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
const isValidEmail = (email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => password && password.length >= 6;

// Сообщения об ошибках
const ERROR_MESSAGES = {
  INVALID_USERNAME: 'Invalid username (letters, digits, underscore, min 3 chars)',
  WEAK_PASSWORD: 'Password must be at least 6 characters',
  INVALID_EMAIL: 'Invalid email address',
  SERVER_MISCONFIG: 'Server misconfiguration',
  USER_EXISTS_WRONG_CRED: 'User exists but wrong credentials',
  REGISTRATION_FAILED: 'Registration failed',
};

// Middleware аутентификации
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

// Работа с настройками пользователя
const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('theme, save_history')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    theme: data?.theme || 'dark',
    saveHistory: data?.save_history !== false,
  };
};

const saveUserSettings = async (userId, theme, saveHistory) => {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, theme, save_history: saveHistory }, { onConflict: 'user_id' });

  if (error) throw error;
};

// Работа с чатами
const getChats = async (userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

const getChatById = async (chatId, userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (error) return null;

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, reasoning, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

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

// Фоновое создание записей пользователя
const createUserSettingsAndProfile = async (userId, username) => {
  try {
    await Promise.all([
      supabaseAdmin.from('user_settings').upsert(
        { user_id: userId, theme: 'dark', save_history: true },
        { onConflict: 'user_id' }
      ),
      supabaseAdmin.from('profiles').upsert(
        { id: userId, username },
        { onConflict: 'id' }
      ),
    ]);
  } catch (err) {
    console.error('Failed to create user_settings/profile:', err);
  }
};

// ========== ЭНДПОЙНТЫ АВТОРИЗАЦИИ ==========
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: ERROR_MESSAGES.INVALID_USERNAME });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: ERROR_MESSAGES.WEAK_PASSWORD });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: ERROR_MESSAGES.INVALID_EMAIL });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: ERROR_MESSAGES.SERVER_MISCONFIG });
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
        const { data: signData, error: signError } = await supabase.auth.signInWithPassword({ email, password });
        if (signError) {
          return res.status(409).json({ error: ERROR_MESSAGES.USER_EXISTS_WRONG_CRED });
        }
        return res.json({
          success: true,
          token: signData.session?.access_token,
          refresh_token: signData.session?.refresh_token,
        });
      }
      throw error;
    }

    const userId = data.user.id;
    createUserSettingsAndProfile(userId, username);
    await new Promise(resolve => setTimeout(resolve, 500));

    let token = null, refreshToken = null;
    try {
      const { data: signData } = await supabase.auth.signInWithPassword({ email, password });
      token = signData.session?.access_token;
      refreshToken = signData.session?.refresh_token;
    } catch (signErr) {
      console.warn('Sign-in after registration failed (non-critical):', signErr);
    }

    return res.json({ success: true, token, refresh_token: refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message || ERROR_MESSAGES.REGISTRATION_FAILED });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'No refresh token' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: error.message });

  res.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    success: true,
    token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
});

app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

app.get('/api/auth/status', authenticate, (req, res) => {
  res.json({
    authenticated: true,
    username: req.user.email?.split('@')[0],
    email: req.user.email,
  });
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
  if (signError) return res.status(401).json({ error: 'Old password incorrect' });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return res.status(500).json({ error: error.message });

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
  if (existing) return res.status(409).json({ error: 'Username taken' });

  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername })
    .eq('id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, newUsername });
});

app.delete('/api/auth/delete-account', authenticate, async (req, res) => {
  const { password } = req.body;
  if (!supabaseAdmin) return res.status(500).json({ error: 'Admin client not configured' });

  const { error: signError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password,
  });
  if (signError) return res.status(401).json({ error: 'Invalid password' });

  await supabase.from('profiles').delete().eq('id', req.user.id);
  await supabaseAdmin.auth.admin.deleteUser(req.user.id);
  res.json({ success: true });
});

// ========== НАСТРОЙКИ ==========
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

// ========== УПРАВЛЕНИЕ ЧАТАМИ ==========
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
  if (!title) return res.status(400).json({ error: 'Title required' });

  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', req.params.chatId)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

app.put('/api/chats/:chatId/truncate', authenticate, async (req, res) => {
  const { keepIndex } = req.body;
  if (typeof keepIndex !== 'number') return res.status(400).json({ error: 'keepIndex required' });

  try {
    const chat = await getChatById(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

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
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
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

// ========== АВАТАРЫ ==========
app.get('/api/user/avatar', authenticate, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', req.user.id)
    .single();
  let avatarUrl = data?.avatar_url;
  if (avatarUrl) avatarUrl += (avatarUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  res.json({ url: avatarUrl || null });
});

app.post('/api/user/avatar/upload', authenticate, upload.single('avatar'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Not an image' });
  if (file.size > 5 * 1024 * 1024) return res.status(400).json({ error: 'File too large' });

  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `avatars/${req.user.id}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Upload failed' });

  const { data: { publicUrl } } = supabaseAdmin.storage.from('avatars').getPublicUrl(filePath);

  let { data: profile, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', req.user.id)
    .single();

  if (selectError && selectError.code === 'PGRST116') {
    await supabaseAdmin.from('profiles').insert({
      id: req.user.id,
      username: req.user.email?.split('@')[0],
      avatar_url: publicUrl,
    });
  } else if (profile) {
    await supabaseAdmin.from('profiles').update({ avatar_url: publicUrl }).eq('id', req.user.id);
  } else {
    return res.status(500).json({ error: 'Failed to check profile' });
  }

  res.json({ url: publicUrl });
});

// ========== ОСНОВНОЙ ЭНДПОЙНТ ЧАТА (без streaming) ==========
app.post('/api/chat', authenticate, async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;

  if (!chatId || !newMessage) {
    return res.status(400).json({ error: 'chatId and newMessage required' });
  }
  if (!NVIDIA_API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY not configured' });
  }

  try {
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
      chat.messages.push({ role: 'user', content: newMessage });
    }

    // Подготовка истории для API
    const messagesForApi = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const payload = {
      model: NVIDIA_MODEL,
      messages: messagesForApi,
      max_tokens: 16384,
      temperature: 0.60,
      top_p: 0.95,
      top_k: 20,
      presence_penalty: 0,
      repetition_penalty: 1,
      stream: false,
      chat_template_kwargs: {
        enable_thinking: true,
        reasoning_effort,
      },
    };

    const response = await axios.post(NVIDIA_INVOKE_URL, payload, {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json',
      },
      timeout: 120000,
    });

    const assistant = response.data.choices[0]?.message;
    const assistantContent = assistant?.content || '';
    const assistantReasoning = assistant?.reasoning || assistant?.reasoning_content || '';

    // Сохраняем ответ, если включено сохранение истории
    if (shouldSave) {
      chat.messages.push({
        role: 'assistant',
        content: assistantContent,
        reasoning: assistantReasoning,
      });

      if (chat.title === 'Новый чат' && assistantContent.length > 10) {
        chat.title = assistantContent.slice(0, 30) + (assistantContent.length > 30 ? '…' : '');
      }

      await saveChat(chat, req.user.id);
    }

    // Возвращаем результат клиенту
    res.json({
      content: assistantContent,
      reasoning: assistantReasoning,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: err.message,
      // для отладки можно добавить stack в development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
});

export default app;