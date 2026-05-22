import { openai } from './config.js';
import { countTokens } from './usage/tokenCounter.js';

const MAX_TOKENS_FOR_SUMMARY = 1500;

export async function generateSummary(messages) {
  if (!messages.length) return '';

  const conversation = messages.map(m => 
    `${m.role === 'user' ? 'Пользователь' : 'Помощник'}: ${m.content}`
  ).join('\n');

  const prompt = {
    role: 'user',
    content: `Сделай краткое изложение диалога. Сохрани ключевую информацию: темы, вопросы, ответы, выводы. Пиши на русском.\n\nДиалог:\n${conversation}`
  };

  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-oss-20b',
    messages: [prompt],
    temperature: 0.3,
    max_tokens: MAX_TOKENS_FOR_SUMMARY,
  });

  return completion.choices[0].message.content.trim();
}

export function estimateTokens(messages) {
  let total = 0;

  for (const msg of messages) {
    total += countTokens(msg.content);
  }
  
  return total;
}