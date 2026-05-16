# Vortex

AI чат-ассистент с поддержкой reasoning mode, streaming ответов и авторизацией пользователей, построенный на Node.js и модели `gpt-oss-120b` через NVIDIA API.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![Express](https://img.shields.io/badge/Express.js-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3ECF8E)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--OSS--20B-blue)
![License](https://img.shields.io/badge/license-MIT-purple)

---

# Возможности

- GPT-OSS-120B reasoning model
- Streaming AI responses (SSE)
- Thinking / reasoning mode
- История чатов
- Авторизация пользователей
- Настройки профиля
- Загрузка аватаров
- Rate limiting
- Helmet security
- Supabase integration
- Modern chat UI
- Responsive frontend

---

# Стек технологий

## Backend

- Node.js
- Express.js
- OpenAI SDK
- Supabase
- Helmet
- Express Rate Limit
- Multer

## Frontend

- Vanilla JavaScript
- HTML5
- CSS3

## AI

- GPT-OSS-120B
- NVIDIA API
- Streaming responses
- Reasoning mode

---

# Архитектура проекта

```text
project/
│
├── config/          # Конфигурация
├── db/              # Работа с базой данных
├── middleware/      # Middleware
├── public/          # Frontend
├── routes/          # API routes
├── uploads/         # Uploaded files
├── server.js        # Entry point
└── package.json
```

---

# Установка

## 1. Клонирование репозитория

```bash
git clone https://github.com/Bloodray636/GPT-OSS-20B-Free.git

cd GPT-OSS-20B-Free
```

---

## 2. Установка зависимостей

```bash
npm install
```

---

# Настройка `.env`

Создай файл `.env`:

```env
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://integrate.api.nvidia.com/v1

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

JWT_SECRET=your_secret
```

---

# Запуск проекта

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

---

# NVIDIA API

Проект использует NVIDIA inference API для работы модели `gpt-oss-20b`.

Пример конфигурации:

```js
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});
```

---

# Streaming Responses

Проект поддерживает real-time streaming через SSE:

```js
res.setHeader('Content-Type', 'text/event-stream');
```

---

# Reasoning Mode

Поддерживается reasoning/thinking режим модели:

```js
extra_body: {
  chat_template_kwargs: {
    thinking: true,
    reasoning_effort: "medium"
  }
}
```

---

# Безопасность

В проекте реализовано:

- Helmet security headers
- Rate limiting
- JWT authentication
- Protected API routes
- File upload validation

---

# API

## Chat Request

### POST `/api/chat`

```json
{
  "message": "Hello",
  "chatId": "123"
}
```

---

# Основные возможности

## AI Chat

- Streaming responses
- Chat history
- Reasoning support
- Conversation memory

## User System

- Registration
- Login
- User settings
- Avatar upload

## Security

- Rate limit
- Helmet
- Middleware protection

---

# Производительность

Проект использует:

- SSE streaming
- Incremental rendering
- Optimized chat updates
- Lightweight frontend

---

# Лицензия

MIT License

---

# Автор

GitHub:  
https://github.com/Bloodray636

---