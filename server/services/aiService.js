import { getAIProvider } from '../ai/factory.js';
import { countTokens } from '../usage/tokenCounter.js';
import { estimateCost } from '../usage/costCalculator.js';
import { logAIUsage } from '../db.js';

const PROVIDER = process.env.AI_PROVIDER || 'nvidia';
const MODEL = process.env.AI_MODEL || 'openai/gpt-oss-120b';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS) || 4096;

const aiProvider = getAIProvider(PROVIDER);

export async function* streamAIResponse(messages, reasoningEffort = 'medium', signal = null, userId = null, model = MODEL) {
  // 1. Подсчёт токенов промпта
  const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const promptTokens = countTokens(fullPrompt);

  let assistantContent = '';
  let assistantReasoning = '';

  const options = {
    model,
    reasoning_effort,
    max_tokens: MAX_TOKENS,
    temperature: 1,
    top_p: 1,
  };

  // 2. Потоковая генерация
  const stream = aiProvider.streamCompletion(messages, options, signal);
  for await (const { reasoning, content } of stream) {
    if (reasoning) assistantReasoning += reasoning;
    if (content) {
      assistantContent += content;
      yield { reasoning, content };
    }
  }

  // 3. Подсчёт токенов ответа и логирование
  const completionTokens = countTokens(assistantContent + assistantReasoning);
  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = estimateCost(model, promptTokens, completionTokens);

  if (userId) {
    logAIUsage(userId, model, promptTokens, completionTokens, estimatedCost).catch(err =>
      console.error('Async logging error:', err)
    );
  }

  console.log(`📊 Usage: prompt=${promptTokens}, completion=${completionTokens}, total=${totalTokens}, cost=$${estimatedCost.toFixed(6)}`);
}