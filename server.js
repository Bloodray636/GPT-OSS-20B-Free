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

app.use((req, res, next) => {
  res.setHeader('Alt-Svc', '');
  next();
});

app.set('trust proxy', 1);

// Лимиты
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false, 

  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return ip;
  },

  message: { error: 'Слишком много запросов с вашего IP. Попробуйте позже.' },
  skip: (req) => req.path === '/api/auth/refresh',
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  skipSuccessfulRequests: true, 
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
    return ip;
  },
  message: { error: 'Слишком много попыток. Подождите 15 минут.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.http(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  
  next();
});

app.use(express.json());
app.use(express.static('public'));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/user/avatar', avatarRoutes);
app.use('/api/chat', chatRoutes);

app.use((err, req, res, next) => {
  logger.error(`Ошибка: ${err.message}`, { stack: err.stack, url: req.url });
  res.status(500).json({ error: 'Internal server error' });
});

export default app;