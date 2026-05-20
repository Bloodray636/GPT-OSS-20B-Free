import express from 'express';
import helmet from 'helmet';
import { limiter, authLimiter } from './server/middleware/rateLimit.js';
import { httpLogger } from './server/middleware/logging.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import healthRoutes from './server/routes/health.js';
import authRoutes from './server/routes/auth.js';
import settingsRoutes from './server/routes/settings.js';
import chatsRoutes from './server/routes/chats.js';
import avatarRoutes from './server/routes/avatar.js';
import chatRoutes from './server/routes/chat.js';

const app = express();

// Безопасность
app.use(helmet());

// Health check
app.use('/health', healthRoutes);

// Rate limiting
app.use(limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);

// Стандартные middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// Логирование HTTP‑запросов
app.use(httpLogger);

// Основные API
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/user/avatar', avatarRoutes);
app.use('/api/chat', chatRoutes);

// Глобальный обработчик ошибок
app.use(errorHandler);

export default app;