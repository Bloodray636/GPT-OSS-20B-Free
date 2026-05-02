import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import OpenAI from 'openai';
import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// ===== Инициализация =====
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// ===== Константы путей =====
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// ===== Вспомогательные файловые функции =====
const ensureDir = async (dir) => {
  try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
};

const readJSON = async (filePath, defaultValue = {}) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
};

const writeJSON = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// ===== Работа с пользователями =====
const getUserDir = (username) => path.join(DATA_DIR, 'users', username);
const getUserSettingsPath = (username) => path.join(getUserDir(username), 'settings.json');
const getUserChatsPath = (username) => path.join(getUserDir(username), 'chats.json');

const getUserSettings = async (username) => {
  const data = await readJSON(getUserSettingsPath(username));
  return { theme: 'dark', saveHistory: true, ...data };
};

const saveUserSettings = async (username, settings) => {
  await ensureDir(getUserDir(username));
  await writeJSON(getUserSettingsPath(username), settings);
};

const getUserChats = async (username) => {
  return await readJSON(getUserChatsPath(username), []);
};

const saveUserChats = async (username, chats) => {
  await ensureDir(getUserDir(username));
  await writeJSON(getUserChatsPath(username), chats);
};

const getChatById = async (username, chatId) => {
  const chats = await getUserChats(username);
  return chats.find(c => c.id === chatId);
};

const saveChat = async (username, chat) => {
  let chats = await getUserChats(username);
  const index = chats.findIndex(c => c.id === chat.id);
  if (index >= 0) chats[index] = chat;
  else chats.push(chat);
  await saveUserChats(username, chats);
  return chat;
};

const deleteChat = async (username, chatId) => {
  let chats = await getUserChats(username);
  chats = chats.filter(c => c.id !== chatId);
  await saveUserChats(username, chats);
};

// ===== Аутентификация =====
const requireAuth = (req, res, next) => {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ===== OpenAI клиент =====
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 120000,
});

// ===== Middleware =====
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 },
}));

// ===== Multer настройка для аватаров =====
const AVATAR_FIELD = 'avatar';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const username = req.session.user.username;
    const userAvatarDir = path.join(DATA_DIR, 'users', username, 'avatar');
    await ensureDir(userAvatarDir);
    cb(null, userAvatarDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Неподдерживаемый формат файла'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// ===== Функция поиска файла аватара =====
async function findAvatarFile(username) {
  const userDir = path.join(DATA_DIR, 'users', username);
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (const ext of extensions) {
    const filePath = path.join(userDir, `avatar${ext}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {}
  }
  return null;
}

// ===== Эндпоинты аватаров =====
app.post('/api/user/avatar', requireAuth, upload.single(AVATAR_FIELD), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  res.json({ success: true, filename: req.file.filename });
});

app.get('/api/user/avatar', requireAuth, async (req, res) => {
  const username = req.session.user.username;
  const avatarPath = await findAvatarFile(username);
  if (avatarPath) {
    try {
      await fs.access(avatarPath);
      res.sendFile(avatarPath);
    } catch {
      res.status(404).json({ error: 'Avatar not found' });
    }
  } else {
    res.status(404).json({ error: 'Avatar not found' });
  }
});

app.delete('/api/user/avatar', requireAuth, async (req, res) => {
  const username = req.session.user.username;
  const avatarPath = await findAvatarFile(username);
  if (avatarPath) {
    await fs.unlink(avatarPath);
  }
  res.json({ success: true });
});

// ===== Аутентификационные маршруты =====
// Регистрация
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3) return res.status(400).json({ error: 'Min 3 characters' });
  if (password.length < 6) return res.status(400).json({ error: 'Min 6 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Only letters, numbers, underscore' });

  await ensureDir(DATA_DIR);
  const users = await readJSON(USERS_FILE, {});
  if (users[username]) return res.status(409).json({ error: 'Username already exists' });

  users[username] = await bcrypt.hash(password, 10);
  await writeJSON(USERS_FILE, users);

  const userDir = getUserDir(username);
  await ensureDir(userDir);
  await writeJSON(getUserChatsPath(username), []);
  await writeJSON(getUserSettingsPath(username), { theme: 'dark', saveHistory: true });

  req.session.user = { username };
  res.json({ success: true });
});

// Логин
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  await ensureDir(DATA_DIR);
  const users = await readJSON(USERS_FILE, {});
  const hash = users[username];
  if (!hash) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.user = { username };
  res.json({ success: true });
});

// Логаут
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Статус
app.get('/api/auth/status', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, username: req.session.user.username });
  } else {
    res.json({ authenticated: false });
  }
});

// Смена пароля
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const username = req.session.user.username;

  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'All fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters' });

  const users = await readJSON(USERS_FILE, {});
  const hash = users[username];
  if (!hash) return res.status(401).json({ error: 'User not found' });
  const match = await bcrypt.compare(oldPassword, hash);
  if (!match) return res.status(401).json({ error: 'Incorrect old password' });
  users[username] = await bcrypt.hash(newPassword, 10);
  await writeJSON(USERS_FILE, users);
  res.json({ success: true });
});

// Смена никнейма
app.post('/api/auth/change-username', requireAuth, async (req, res) => {
  const { newUsername } = req.body;
  const oldUsername = req.session.user.username;

  if (!newUsername) return res.status(400).json({ error: 'Username required' });
  if (newUsername.length < 3) return res.status(400).json({ error: 'Min 3 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) return res.status(400).json({ error: 'Invalid characters' });
  if (newUsername === oldUsername) return res.status(400).json({ error: 'Same username' });

  const users = await readJSON(USERS_FILE, {});
  if (users[newUsername]) return res.status(409).json({ error: 'Username already exists' });

  users[newUsername] = users[oldUsername];
  delete users[oldUsername];
  await writeJSON(USERS_FILE, users);

  const oldDir = getUserDir(oldUsername);
  const newDir = getUserDir(newUsername);
  await fs.rename(oldDir, newDir);

  req.session.user.username = newUsername;
  res.json({ success: true, newUsername });
});

// Удаление аккаунта
app.delete('/api/auth/delete-account', requireAuth, async (req, res) => {
  const { password } = req.body;
  const username = req.session.user.username;

  const users = await readJSON(USERS_FILE, {});
  const hash = users[username];
  if (!hash) return res.status(401).json({ error: 'User not found' });
  const match = await bcrypt.compare(password, hash);
  if (!match) return res.status(401).json({ error: 'Invalid password' });

  delete users[username];
  await writeJSON(USERS_FILE, users);

  const userDir = getUserDir(username);
  await fs.rm(userDir, { recursive: true, force: true });

  req.session.destroy();
  res.json({ success: true });
});

// ===== Настройки пользователя =====
app.get('/api/settings', requireAuth, async (req, res) => {
  const settings = await getUserSettings(req.session.user.username);
  res.json(settings);
});

app.post('/api/settings', requireAuth, async (req, res) => {
  const { theme, saveHistory } = req.body;
  await saveUserSettings(req.session.user.username, { theme, saveHistory });
  res.json({ success: true });
});

// ===== Управление чатами =====
app.get('/api/chats', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const chats = await getUserChats(req.session.user.username);
  const list = chats.map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt }));
  res.json(list);
});

app.post('/api/chats', requireAuth, async (req, res) => {
  const newChat = {
    id: Date.now().toString(),
    title: 'Новый чат',
    createdAt: new Date().toISOString(),
    messages: [],
  };
  await saveChat(req.session.user.username, newChat);
  res.json(newChat);
});

app.delete('/api/chats/:chatId', requireAuth, async (req, res) => {
  await deleteChat(req.session.user.username, req.params.chatId);
  res.json({ success: true });
});

app.put('/api/chats/:chatId', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const username = req.session.user.username;
  const chats = await getUserChats(username);
  const index = chats.findIndex(c => c.id === chatId);
  if (index === -1) return res.status(404).json({ error: 'Chat not found' });
  chats[index].title = title;
  await saveUserChats(username, chats);
  res.json({ success: true, chat: chats[index] });
});

app.put('/api/chats/:chatId/truncate', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  let { keepIndex } = req.body;
  if (typeof keepIndex !== 'number') return res.status(400).json({ error: 'keepIndex required' });
  const username = req.session.user.username;
  let chat = await getChatById(username, chatId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (keepIndex === -1) {
    chat.messages = [];
  } else if (keepIndex >= 0 && keepIndex < chat.messages.length) {
    chat.messages = chat.messages.slice(0, keepIndex + 1);
  } else {
    return res.status(400).json({ error: 'Invalid keepIndex' });
  }
  await saveChat(username, chat);
  res.json({ success: true });
});

app.get('/api/chats/:chatId', requireAuth, async (req, res) => {
  const chat = await getChatById(req.session.user.username, req.params.chatId);
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  res.json(chat);
});

// ===== AI чат (streaming) =====
app.post('/api/chat', requireAuth, async (req, res) => {
  const { chatId, newMessage, reasoning_effort = 'medium' } = req.body;
  if (!chatId || !newMessage) {
    return res.status(400).json({ error: 'chatId and newMessage required' });
  }

  const username = req.session.user.username;
  const settings = await getUserSettings(username);
  const shouldSave = settings.saveHistory;

  let chat = await getChatById(username, chatId);
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
      extra_body: {
        chat_template_kwargs: {
          thinking: true,
          reasoning_effort: reasoning_effort,
        },
      },
    });

    let assistantContent = '';
    let assistantReasoning = '';

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
        reasoning: assistantReasoning,
      });
      if (chat.title === 'Новый чат' && assistantContent.length > 10) {
        chat.title = assistantContent.slice(0, 30) + (assistantContent.length > 30 ? '…' : '');
      }
      await saveChat(username, chat);
    }
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// ===== Запуск сервера =====
const init = async () => {
  await ensureDir(DATA_DIR);
  const users = await readJSON(USERS_FILE, {});
  if (Object.keys(users).length === 0) {
    const hash = await bcrypt.hash('admin', 10);
    await writeJSON(USERS_FILE, { admin: hash });
    console.log('✅ Создан пользователь admin / admin');
  }
  app.listen(port, () => console.log(`✅ Сервер запущен: http://localhost:${port}`));
};

init();