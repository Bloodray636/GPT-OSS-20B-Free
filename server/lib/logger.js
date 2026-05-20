import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Определяем уровни
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Уровень логирования в зависимости от окружения
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Цвета для уровней
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
});

// Формат для файлов
const fileFormat = winston.format.combine(
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

// Формат для консоли
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
);

// Транспорты
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    forceConsole: true,
  }),
];

// Файловые для разработки
if (process.env.NODE_ENV === 'development' || process.env.LOCAL_LOGS === 'true') {
  const logDir = path.join(__dirname, '../logs');

  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});