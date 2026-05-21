import express from 'express';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

//Запрет на любые параметры
const healthQuerySchema = z.object({}).strict(); // запрещает любые query параметры

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;