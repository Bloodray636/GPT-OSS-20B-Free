import express from 'express';
import { authenticate } from '../middleware.js';
import { supabase, supabaseAdmin, upload } from '../config.js';

const router = express.Router();

// Получение аватара
router.get('/', authenticate, async (req, res) => {
  res.setHeader(
    'Cache-Control', 
    'no-store, no-cache, must-revalidate, private'
  );

  res.setHeader(
    'Pragma', 
    'no-cache'
  );

  res.setHeader(
    'Expires', 
    '0'
  );

  const { data } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', req.user.id)
    .single();

  let avatarUrl = data?.avatar_url;

  if (avatarUrl) {
    avatarUrl = avatarUrl + (avatarUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
  }

  res.json({ url: avatarUrl || null });
});

// Загрузка аватара
router.post('/upload', authenticate, upload.single('avatar'), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ 
      error: 'No file uploaded' 
    });
  }

  if (!file.mimetype.startsWith('image/')) {
    return res.status(400).json({ 
      error: 'Not an image' 
    });
  }

  if (file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ 
      error: 'File too large' 
    });
  }

  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `avatars/${req.user.id}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(
      filePath, 
      file.buffer, 
      { 
        contentType: 
          file.mimetype, 
          upsert: true 
      });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return res.status(500).json({ 
      error: 'Upload failed' 
    });
  }

  const { data: { publicUrl } } = supabaseAdmin
    .storage
    .from('avatars')
    .getPublicUrl(filePath);

  let { data: profile, error: selectError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', req.user.id)
    .single();

  if (selectError && selectError.code === 'PGRST116') {
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({ 
        id: req.user.id, 
        username: req.user.email?.split('@')[0], 
        avatar_url: publicUrl 
      });

    if (insertError) {
      return res.status(500).json({ 
        error: 'Failed to create profile' 
      });
    }

  } else if (profile) {
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id);

    if (updateError) {
      return res.status(500).json({ 
        error: 'Failed to update profile' 
      });
    }
  } else {
    return res.status(500).json({ 
      error: 'Failed to check profile' 
    });
  }

  res.json({ url: publicUrl });
});

router.get('/proxy', authenticate, async (req, res) => {
  try {
   
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', req.user.id)
      .single();

    if (!data?.avatar_url) {
      return res.status(404).json({ error: 'Avatar not found' });
    }

    const response = await fetch(data.avatar_url);
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch avatar from storage' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Avatar proxy error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;