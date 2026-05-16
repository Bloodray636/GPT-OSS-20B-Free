import express from 'express';
import { authenticate } from '../middleware.js';
import { getUserSettings, saveUserSettings } from '../db.js';

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

router.post('/', authenticate, async (req, res) => {
  const { theme, saveHistory } = req.body;

  try {
    await saveUserSettings(
      req.user.id, 
      theme, 
      saveHistory
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ 
      error: err.message 
    });
  }
});

export default router;