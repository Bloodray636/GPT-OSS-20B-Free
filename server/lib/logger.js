import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Окружения
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Цвета
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
});

// Форматы
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),

  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (meta && Object.keys(meta).length) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })

);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

// Транспорты
const transports = [];

// Консоль всегда
transports.push(new winston.transports.Console({
  format: consoleFormat,
  forceConsole: true,
}));

// Файлы только локально
if (process.env.NODE_ENV === 'development' || process.env.LOCAL_LOGS === 'true') {
  const logDir = path.join(__dirname, '../logs');

  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format,
  }));

  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format,
  }));
}

export const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});