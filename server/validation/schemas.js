import { z } from 'zod';

// Базовые схемы
const usernameSchema = z.string()
  .min(3, 'Имя пользователя должно быть не менее 3 символов')
  .max(30, 'Имя пользователя не может превышать 30 символов')
  .regex(/^[a-zA-Z0-9_]+$/, 'Имя пользователя может содержать только буквы, цифры и подчеркивание');

const emailSchema = z.string()
  .email('Некорректный email')
  .max(255, 'Email слишком длинный');

const passwordSchema = z.string()
  .min(6, 'Пароль должен быть не менее 6 символов')
  .max(100, 'Пароль слишком длинный');

const messageSchema = z.string()
  .min(1, 'Сообщение не может быть пустым')
  .max(5000, 'Сообщение не может превышать 5000 символов');

const chatIdSchema = z.string()
  .min(1, 'chatId обязателен')
  .max(50, 'chatId слишком длинный');

// Схемы для эндпоинтов
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Старый пароль обязателен'),
  newPassword: passwordSchema,
});

export const changeUsernameSchema = z.object({
  newUsername: usernameSchema,
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Пароль обязателен'),
});

export const createChatSchema = z.object({
  title: z.string()
    .min(1, 'Название чата не может быть пустым')
    .max(100, 'Название чата слишком длинное')
    .optional(),
});

export const renameChatSchema = z.object({
  title: z.string()
    .min(1, 'Название чата не может быть пустым')
    .max(100, 'Название чата слишком длинное'),
});

export const truncateChatSchema = z.object({
  keepIndex: z.number()
    .int('keepIndex должно быть целым числом')
    .min(-1, 'keepIndex не может быть меньше -1'),
});

export const updateMessageSchema = z.object({
  content: z.string()
    .min(1, 'Сообщение не может быть пустым')
    .max(5000, 'Сообщение слишком длинное'),
});

export const sendMessageSchema = z.object({
  chatId: chatIdSchema,
  newMessage: messageSchema,
  reasoning_effort: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const avatarUploadSchema = z.object({});

// Параметры URL
export const chatIdParamSchema = z.object({
  chatId: chatIdSchema,
});

export const messageIndexParamSchema = z.object({
  chatId: chatIdSchema,
  messageIndex: z.string()
    .regex(/^\d+$/, 'messageIndex должен быть числом')
    .transform(Number),
});

export const settingsSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
  saveHistory: z.boolean().optional(),
});