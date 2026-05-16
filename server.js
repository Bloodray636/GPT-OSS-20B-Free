import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './server/routes/auth.js';
import settingsRoutes from './server/routes/settings.js';
import chatsRoutes from './server/routes/chats.js';
import avatarRoutes from './server/routes/avatar.js';
import chatRoutes from './server/routes/chat.js';

const app = express();

// Безопасные заголовки
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://integrate.api.nvidia.com"],
    },
  },
}));

// Лимиты
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false, 
  message: { error: 'Слишком много запросов с вашего IP. Попробуйте позже.' },
  skip: (req) => req.path === '/api/auth/refresh',
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  skipSuccessfulRequests: true, 
  message: { error: 'Слишком много попыток. Подождите 15 минут.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);

app.use(express.json());
app.use(express.static('public'));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/user/avatar', avatarRoutes);
app.use('/api/chat', chatRoutes);

export default app;