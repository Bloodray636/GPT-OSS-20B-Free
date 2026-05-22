import { encode } from 'gpt-tokenizer';

export function countTokens(text) {
  if (!text) return 0;
  try {
    return encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}