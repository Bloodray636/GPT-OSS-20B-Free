import { NvidiaProvider } from './nvidiaProvider.js';

const DEFAULT_PROVIDER = 'nvidia';

export function getAIProvider(providerName = DEFAULT_PROVIDER) {
  switch (providerName) {
    case 'nvidia':
      return new NvidiaProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}