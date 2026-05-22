import { getAIProvider } from '../ai/factory.js';

// Настройки провайдера и модели
const PROVIDER = process.env.AI_PROVIDER || 'nvidia';
const MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 4096;

const aiProvider = getAIProvider(PROVIDER);

export async function* streamAIResponse(messages, reasoningEffort = 'medium', signal) {
  const options = {
    model: MODEL,
    reasoning_effort: reasoningEffort,
    max_tokens: MAX_TOKENS,
    temperature: 1,
    top_p: 1,
  };
  
  yield* aiProvider.streamCompletion(messages, options, signal);
}