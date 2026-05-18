import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './server/routes/auth.js';
import settingsRoutes from './server/routes/settings.js';
import chatsRoutes from './server/routes/chats.js';
import avatarRoutes from './server/routes/avatar.js';
import chatRoutes from './server/routes/chat.js';

const app = express();

// Helmet
app.use(helmet());

// Общий лимитер
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Лимитер для чувствительных маршрутов
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);

app.use(express.json());
app.use(express.static('public'));

// Подключаем маршруты
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/user/avatar', avatarRoutes);
app.use('/api/chat', chatRoutes);

// Обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;