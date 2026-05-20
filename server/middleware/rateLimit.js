import rateLimit from 'express-rate-limit';

// Общий лимитер для всех запросов
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 минут
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий лимитер для аутентификации
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});