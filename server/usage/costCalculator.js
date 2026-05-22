const PRICES = {
    'openai/gpt-oss-120b': { 
        input: 0.50, 
        output: 0.50 
    },
    'openai/gpt-oss-20b': { 
        input: 0.20, 
        output: 0.20 
    },
    'deepseek-ai/deepseek-v4-flash': { 
        input: 0.30, 
        output: 0.30 
    },
    default: { 
        input: 0.50, 
        output: 0.50 
    },
};

export function estimateCost(model, promptTokens, completionTokens) {
  const price = PRICES[model] || PRICES.default;
  const inputCost = (promptTokens / 1_000_000) * price.input;
  const outputCost = (completionTokens / 1_000_000) * price.output;
  return inputCost + outputCost;
}