import express from 'express';
import authRoutes from './server/routes/auth.js';
import settingsRoutes from './server/routes/settings.js';
import chatsRoutes from './server/routes/chats.js';
import avatarRoutes from './server/routes/avatar.js';
import chatRoutes from './server/routes/chat.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/user/avatar', avatarRoutes);
app.use('/api/chat', chatRoutes);

export default app;