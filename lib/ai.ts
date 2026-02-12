import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Provider } from './db';

export function createAIProvider(provider: Provider) {
  if (!provider.api_key) {
    throw new Error(`API key not configured for provider: ${provider.name}`);
  }

  switch (provider.type) {
    case 'openai_compatible':
      return createOpenAI({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
      });
    case 'anthropic':
      return createAnthropic({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
      });
    case 'google':
      return createGoogleGenerativeAI({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
      });
    default:
      throw new Error(`Unknown provider type: ${(provider as Provider).type}`);
  }
}

export function getLanguageModel(provider: Provider, modelId: string) {
  const aiProvider = createAIProvider(provider);
  return aiProvider(modelId);
}
