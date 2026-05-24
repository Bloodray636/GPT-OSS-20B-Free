export const PRESETS = {
//   fast: {
//     name: 'Быстрый',
//     model: 'deepseek-ai/deepseek-v4-flash',
//     max_tokens: 1024,
//     temperature: 0.7,
//     reasoning_effort: 'low',
//     top_p: 0.9,
//   },
//   balanced: {
//     name: 'Сбалансированный',
//     model: 'deepseek-ai/deepseek-v3.2',
//     max_tokens: 2048,
//     temperature: 0.8,
//     reasoning_effort: 'medium',
//     top_p: 0.95,
//   },
  quality: {
    name: 'Качественный',
    model: 'openai/gpt-oss-120b',
    max_tokens: 4096,
    temperature: 1.0,
    reasoning_effort: 'high',
    top_p: 1.0,
  },
};

// Конфигурация по умолчанию
export const AI_CONFIG = {
  // Активный пресет
  activePreset: process.env.AI_PRESET || 'quality',

  // Индивидуальные параметры
  model: process.env.AI_MODEL || null,
  max_tokens: process.env.AI_MAX_TOKENS ? parseInt(process.env.AI_MAX_TOKENS) : null,
  temperature: process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : null,
  reasoning_effort: process.env.AI_REASONING_EFFORT || null,
  top_p: process.env.AI_TOP_P ? parseFloat(process.env.AI_TOP_P) : null,
};

// Текущие параметры
export function getAIParameters() {
  const preset = PRESETS[AI_CONFIG.activePreset] || PRESETS.balanced;

  return {
    model: AI_CONFIG.model || preset.model,
    max_tokens: AI_CONFIG.max_tokens !== null ? AI_CONFIG.max_tokens : preset.max_tokens,
    temperature: AI_CONFIG.temperature !== null ? AI_CONFIG.temperature : preset.temperature,
    reasoning_effort: AI_CONFIG.reasoning_effort || preset.reasoning_effort,
    top_p: AI_CONFIG.top_p !== null ? AI_CONFIG.top_p : preset.top_p,
  };

  console.log('[aiConfig] 🎛️ Active preset:', AI_CONFIG.activePreset);
    console.log('[aiConfig] 📋 Raw config:', {
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.max_tokens,
    temperature: AI_CONFIG.temperature,
    reasoning_effort: AI_CONFIG.reasoning_effort,
    top_p: AI_CONFIG.top_p
    });
}

// Обновление конфигурации
export function updateAIConfig(newConfig) {
  if (newConfig.activePreset && PRESETS[newConfig.activePreset]) {
    AI_CONFIG.activePreset = newConfig.activePreset;
  }

  if (newConfig.model !== undefined) {
    AI_CONFIG.model = newConfig.model;
  }

  if (newConfig.max_tokens !== undefined) {
    AI_CONFIG.max_tokens = newConfig.max_tokens;
  }
  if (newConfig.temperature !== undefined) {
    AI_CONFIG.temperature = newConfig.temperature;
  }

  if (newConfig.reasoning_effort !== undefined) {
    AI_CONFIG.reasoning_effort = newConfig.reasoning_effort;
  }

  if (newConfig.top_p !== undefined) {
    AI_CONFIG.top_p = newConfig.top_p;
  }
}