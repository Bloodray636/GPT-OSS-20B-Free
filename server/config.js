import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage() });

// Supabase
export const supabaseUrl = process.env.SUPABASE_URL;
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// OpenAI
export const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 120000,
});