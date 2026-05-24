import { getAIProvider } from '../ai/factory.js';
import { getAIParameters } from '../ai/aiConfig.js';
import { countTokens } from '../usage/tokenCounter.js';
import { estimateCost } from '../usage/costCalculator.js';
import { logAIUsage } from '../db.js';

const PROVIDER = process.env.AI_PROVIDER || 'nvidia';
const aiProvider = getAIProvider(PROVIDER);

export async function* streamAIResponse(messages, reasoningEffort = "medium", signal = null, userId = null, model = null) {
  // Базовые параметры
  const baseParams = getAIParameters();

  console.log('[aiService] 📦 Base params:', JSON.stringify(baseParams));
  console.log('[aiService] 🔧 Final options:', JSON.stringify({
    model: finalModel,
    reasoning_effort: finalReasoningEffort,
    max_tokens: baseParams.max_tokens,
    temperature: baseParams.temperature,
    top_p: baseParams.top_p
  }));

  const finalModel = model || baseParams.model;
  const finalReasoningEffort = reasoningEffort || baseParams.reasoning_effort;

  const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const promptTokens = countTokens(fullPrompt);

  let assistantContent = '';
  let assistantReasoning = '';

  const options = {
    model: finalModel,
    reasoning_effort: finalReasoningEffort,
    max_tokens: baseParams.max_tokens,
    temperature: baseParams.temperature,
    top_p: baseParams.top_p,
  };

  console.log('Options before streamCompletion:', options);

  console.log('[aiService] ⏳ Creating stream...');

  const stream = aiProvider.streamCompletion(messages, options, signal);

  for await (const { reasoning, content } of stream) {
    if (reasoning) {
      assistantReasoning += reasoning;
    }

    if (content) {
      assistantContent += content;
    }

    yield { 
      reasoning, 
      content 
    };
  }

  const completionTokens = countTokens(assistantContent + assistantReasoning);
  const estimatedCost = estimateCost(finalModel, promptTokens, completionTokens);

  if (userId) {
    logAIUsage(userId, finalModel, promptTokens, completionTokens, estimatedCost).catch(err =>
      console.error('Async logging error:', err)
    );
  }

  console.log(`📊 Usage: model=${finalModel}, prompt=${promptTokens}, completion=${completionTokens}, cost=$${estimatedCost.toFixed(6)}`);
}