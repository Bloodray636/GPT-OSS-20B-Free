import express from 'express';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';
import { settingsSchema } from '../validation/schemas.js';
import { getUserSettings, saveUserSettings } from '../db.js';
import { supabase } from '../config.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await getUserSettings(req.user.id);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.post('/', authenticate, validate(settingsSchema), async (req, res) => {
  const { theme, saveHistory } = req.body;

  try {
    await saveUserSettings(
      req.user.id, 
      theme, 
      saveHistory
    );

    res.json({ 
      success: true 
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

router.get('/usage', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }

  res.json(data);
});

export default router;