import { getAIProvider } from '../ai/factory.js';

const TITLE_MODEL = process.env.TITLE_MODEL || 'openai/gpt-oss-20b';
const MAX_TITLE_LENGTH = 60;
const MAX_WORDS = 6;

export class TitleGenerator {
  constructor() {
    this.provider = getAIProvider();
  }

  async generateTitle(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        return null;
    }

    console.log('[TitleGenerator] Generating for:', userMessage.slice(0, 60));

    const prompt = `Создай краткий заголовок для чата (максимум 5-6 слов) на русском, отражающий суть сообщения. Не используй кавычки, markdown, эмодзи. Верни только заголовок без пояснений.\n\nСообщение: "${userMessage}"\n\nЗаголовок:`;

    try {
      const raw = await this.provider.createCompletion([{ 
            role: 'user', 
            content: prompt 
        }],
        {
          model: TITLE_MODEL,
          max_tokens: 40,
          temperature: 0.2,
        }
      );
      console.log('[TitleGenerator] Raw AI response:', raw);
      return this.cleanTitle(raw);
    } catch (err) {
      console.error('Title generation failed:', err);
      return null;
    }
  }

  cleanTitle(raw) {
    if (!raw) {
        return null;
    }

    let cleaned = raw
      .replace(/[`*#_~>]/g, '') 
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')  
      .trim();

    console.log('[TitleGenerator] Cleaned title:', cleaned);

    // убираем кавычки
    cleaned = cleaned.replace(/^["']|["']$/g, '');

    // ограничение по длине
    if (cleaned.length > MAX_TITLE_LENGTH) {
      cleaned = cleaned.slice(0, MAX_TITLE_LENGTH - 3) + '…';
    }

    return cleaned || null;
  }

  fallbackTitle(userMessage) {
    const words = userMessage.split(/\s+/).filter(w => w.length > 0);
    const fallback = words.slice(0, MAX_WORDS).join(' ');

    return fallback.length > MAX_TITLE_LENGTH
      ? fallback.slice(0, MAX_TITLE_LENGTH - 3) + '…'
      : fallback;
  }
}