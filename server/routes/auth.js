import express from 'express';
import { supabase, supabaseAdmin } from '../config.js';
import { authenticate } from '../middleware.js';
import { validate } from '../middleware/validation.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  changeUsernameSchema,
  deleteAccountSchema,
} from '../validation/schemas.js';

const router = express.Router();

// Фоновое создание записей
const createUserSettingsAndProfile = async (userId, username) => {
  try {
    await Promise.all([
      supabaseAdmin.from('user_settings').upsert(
        { user_id: userId, 
          theme: 'dark', 
          save_history: true 
        },
        { 
          onConflict: 'user_id' 
        }
      ),

      supabaseAdmin.from('profiles').upsert(
        { id: userId, 
          username 
        },
        { 
          onConflict: 'id' 
        }
      ),
    ]);
  } catch (err) {
    console.error('Ошибка при создании профиля', err);
  }
};

// Регистрация
router.post('/register', validate(registerSchema), async (req, res) => {
  const { username, email, password } = req.body;

  if (!supabaseAdmin) {
    return res.status(500).json({ 
      error: 'Server misconfiguration' 
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .auth
      .admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });

    if (error) {
      if (error.message.includes('Уже зарегистрирован')) {
        const { data: signData, error: signError } = await supabase
          .auth
          .signInWithPassword({ 
            email, 
            password 
          });

        if (signError || !signData.session?.access_token) {
          return res.status(409).json({ 
            error: 'Пользователь существует, но не может войти в систему' 
          });
        }

        return res.json({
          success: true,
          token: signData.session.access_token,
          refresh_token: signData.session.refresh_token,
        });
      }

      throw error;
    }

    const userId = data.user.id;
    await createUserSettingsAndProfile(userId, username);

    // Репликация
    await new Promise(resolve => setTimeout(resolve, 1000));

    let token = null;
    let refreshToken = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !token) {
      try {
        const { data: signData, error: signError } = await supabase
          .auth
          .signInWithPassword({ 
            email, 
            password 
          });

        if (!signError && signData?.session?.access_token) {
          token = signData.session.access_token;
          refreshToken = signData.session.refresh_token;
          break;
        }
      } catch {}
      
      attempts++;

      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!token) {
      // Пользователь создан
      return res.status(202).json({
        success: true,
        message: 'Аккаунт создан, просьба выйти',
      });
    }

    return res.json({
      success: true,
      token,
      refresh_token: refreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: err.message || 'Ошибка регистрации' 
    });
  }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ 
      error: 'Не обновился token' 
    });
  }

  const { data, error } = await supabase
    .auth
    .refreshSession({ 
      refresh_token 
    });

  if (error) {
    return res.status(401).json({ 
      error: error.message 
    });
  }

  res.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
});

// Логин
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .auth
    .signInWithPassword({ 
      email, 
      password 
    });

  if (error) {
    return res.status(401).json({ 
      error: 'Invalid credentials' 
    });
  }

  res.json({
    success: true,
    token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
  });
});

router.post('/logout', (req, res) => res.json({ success: true }));

router.get('/status', authenticate, (req, res) => {
  res.json({
    authenticated: true,
    username: req.user.email?.split('@')[0],
    email: req.user.email,
  });
});

// Смена пароля
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const { error: signError } = await supabase
    .auth
    .signInWithPassword({
      email: req.user.email,
      password: oldPassword,
    });

  if (signError) {
    return res.status(401).json({ 
      error: 'Старый пароль не корректный' 
    });
  }

  const { error } = await supabase
    .auth
    .updateUser({ 
      password: newPassword 
    });

  if (error) {
    return res.status(500).json({ 
      error: error.message 
    });
  }

  res.json({ 
    success: true 
  });
});

// Смена никнейма
router.post('/change-username', authenticate, validate(changeUsernameSchema), async (req, res) => {
  const { newUsername } = req.body;

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', newUsername)
    .single();

  if (existing) {
    return res.status(409).json({ 
      error: 'Username taken' }
    );
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

  res.json({ 
    success: true, 
    newUsername 
  });
});

// Удаление аккаунта
router.delete('/delete-account', authenticate, validate(deleteAccountSchema), async (req, res) => {
  const { password } = req.body;
  
  if (!supabaseAdmin) {
    return res.status(500).json({ 
      error: 'Административный клиент не настроен' 
    });
  }

  const { error: signError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password,
  });

  if (signError) {
    return res.status(401).json({ 
      error: 'Некорректный пароль' 
    });
  }

  await supabase
    .from('profiles')
    .delete()
    .eq('id', req.user.id);

  // Удаляем пользователя
  const { error: deleteError } = await supabaseAdmin
    .auth
    .admin
    .deleteUser(req.user.id);

  if (deleteError) {
    console.error('Ошибка удаления пользователя:', deleteError);
    return res.status(500).json({ error: 'Ошибка при удалении аккаунта. Пожалуйста, повторите снова.' });
  }

  res.json({ 
    success: true 
  });
});

export default router;