import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticate } from '../middleware.js';
import { isValidUsername, isValidPassword, isValidEmail, ERROR_MESSAGES } from '../helpers.js';

const router = express.Router();

// Фоновое создание записей
const createUserSettingsAndProfile = async (userId, username) => {
  try {
    await Promise.all([
      supabaseAdmin
        .from('user_settings')
        .upsert(
          { 
            user_id: userId, 
            theme: 'dark', 
            save_history: true 
          },
          { 
            onConflict: 'user_id' 
          }
        ),

      supabaseAdmin
        .from('profiles')
        .upsert(
          { 
            id: userId, 
            username 
          },
          { 
            onConflict: 'id' 
          }
        ),
    ]);
  } catch (err) {
    console.error('Failed to create user_settings/profile:', err);
  }
};

// Регистрация
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!isValidUsername(username)){
    return res.status(400).json({ 
      error: ERROR_MESSAGES.INVALID_USERNAME 
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      error: ERROR_MESSAGES.WEAK_PASSWORD 
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ 
      error: ERROR_MESSAGES.INVALID_EMAIL 
    });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ 
      error: ERROR_MESSAGES.SERVER_MISCONFIG 
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        const { data: signData, error: signError } = await supabase
          .auth
          .signInWithPassword({ 
            email, password 
          });

        if (signError) {
          return res.status(409).json({ 
            error: ERROR_MESSAGES.USER_EXISTS_WRONG_CRED 
          });
        }

        return res.json({ 
          success: true, 
          token: signData.session?.access_token, 
          refresh_token: signData.session?.refresh_token 
        });
      }

      throw error;
    }

    const userId = data.user.id;
    createUserSettingsAndProfile(userId, username);

    await new Promise(resolve => setTimeout(resolve, 500));

    let token = null, refreshToken = null;

    try {
      const { data: signData, error: signError } = await supabase
        .auth
        .signInWithPassword({ 
          email, 
          password 
        });

      if (!signError && signData?.session) {
        token = signData.session.access_token;
        refreshToken = signData.session.refresh_token;
      }

    } catch (signErr) { 
      console.warn('Sign-in after registration failed (non-critical):', signErr); 
    }

    return res.json({ 
      success: true, 
      token, 
      refresh_token: refreshToken 
    });
  } catch (err) {
    res.status(500).json({ 
      error: err.message || ERROR_MESSAGES.REGISTRATION_FAILED 
    });
  }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ 
      error: 'No refresh token' 
    });
  }

  const { data, error } = await supabase
    .auth
    .refreshSession({ refresh_token });

  if (error) return res.status(401).json({ 
    error: error.message 
  });

  res.json({ 
    access_token: data.session?.access_token, 
    refresh_token: data.session?.refresh_token 
  });
});

// Логин
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email and password required' 
    });
  }

  const { data, error } = await supabase
    .auth
    .signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ 
      error: 'Invalid credentials' 
    });
  }

  res.json({ 
    success: true, 
    token: data.session?.access_token, 
    refresh_token: data.session?.refresh_token 
  });
});

router.post('/logout', (req, res) => res.json({ 
  success: true 
}));

router.get('/status', authenticate, (req, res) => {
  res.json({ 
    authenticated: true, 
    username: req.user.email?.split('@')[0], 
    email: req.user.email 
  });
});

// Смена пароля
router.post('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !isValidPassword(newPassword)) {
    return res.status(400).json({ 
      error: 'Invalid password (min 6 characters)' 
    });
  }

  const { error: signError } = await supabase.auth.signInWithPassword({ 
    email: req.user.email, 
    password: oldPassword 
  });

  if (signError) {
    return res.status(401).json({ 
      error: 'Old password incorrect' 
    });
  }

  const { error } = await supabase
    .auth
    .updateUser({ password: newPassword });

  if (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }

  res.json({ success: true });
});

// Смена никнейма
router.post('/change-username', authenticate, async (req, res) => {
  const { newUsername } = req.body;

  if (!isValidUsername(newUsername)) {
    return res.status(400).json({ 
      error: 'Invalid username' 
    });
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', newUsername)
    .single();

  if (existing) {
    return res.status(409).json({ 
      error: 'Username taken' 
    });
  }

  const { error } = await supabase
  .from('profiles')
  .update({ username: newUsername })
  .eq('id', req.user.id);

  if (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }

  res.json({ success: true, newUsername });
});

// Удаление аккаунта
router.delete('/delete-account', authenticate, async (req, res) => {
  const { password } = req.body;

  if (!supabaseAdmin) {
    return res.status(500).json({ 
      error: 'Admin client not configured' 
    });
  }

  const { error: signError } = await supabase.auth.signInWithPassword({ 
    email: req.user.email, 
    password 
  });

  if (signError) {
    return res.status(401).json({ 
      error: 'Invalid password' 
    });
  }

  await supabase
    .from('profiles')
    .delete()
    .eq('id', req.user.id);

  await supabaseAdmin
    .auth
    .admin
    .deleteUser(req.user.id);

  res.json({ success: true });
});

export default router;