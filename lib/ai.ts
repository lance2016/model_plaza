import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { Provider } from './db';

// Custom fetch to log all requests and inject reasoning parameters
const createLoggingFetch = (providerId: string, reasoningEffort?: string) => {
  return async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    
    // Inject reasoning parameters based on provider type
    if (init?.body) {
      try {
        const bodyString = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
        const bodyJson = JSON.parse(bodyString);
        
        // Add stream_options for usage tracking (for all models)
        if (bodyJson.stream) {
          bodyJson.stream_options = {
            include_usage: true
          };
          console.log('✅ Added stream_options for usage tracking');
        }
        
        // Add reasoning parameters if present
        if (reasoningEffort) {
          // Different providers use different parameter formats
          switch (providerId) {
            case 'zhipu':
            case 'deepseek':
              // GLM and DeepSeek use thinking parameter (binary: enabled/disabled)
              bodyJson.thinking = { 
                type: reasoningEffort === 'disabled' ? 'disabled' : 'enabled'
              };
              console.log(`✅ Injected thinking (${bodyJson.thinking.type}) for ${providerId} model`);
              break;
            
            case 'qwen':
              // Qwen uses enable_thinking parameter (boolean)
              bodyJson.enable_thinking = reasoningEffort !== 'disabled' && reasoningEffort !== 'minimal';
              console.log(`✅ Injected enable_thinking (${bodyJson.enable_thinking}) for Qwen model`);
              break;
            
            case 'doubao':
            default:
              // Most providers use reasoning_effort parameter (levels: minimal/low/medium/high)
              bodyJson.reasoning_effort = reasoningEffort;
              console.log('✅ Injected reasoning_effort:', reasoningEffort);
              break;
          }
        }
        
        init = {
          ...init,
          body: JSON.stringify(bodyJson),
        };
      } catch (e) {
        console.log('⚠️ Failed to inject parameters:', e);
      }
    }
    
    console.log('\n=== AI SDK HTTP Request ===');
    console.log('URL:', urlString);
    console.log('Method:', init?.method || 'GET');
    console.log('Headers:', JSON.stringify(init?.headers, null, 2));
    
    if (init?.body) {
      try {
        const bodyString = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
        const bodyJson = JSON.parse(bodyString);
        // Truncate base64 image data in logs
        const safeBody = JSON.stringify(bodyJson, (key, value) => {
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            return value.substring(0, 50) + '...[truncated]';
          }
          // Also handle OpenAI image_url format
          if (key === 'url' && typeof value === 'string' && value.length > 200 && value.includes('base64')) {
            return value.substring(0, 50) + '...[truncated]';
          }
          return value;
        }, 2);
        console.log('Request Body:', safeBody);
      } catch {
        console.log('Request Body (raw):', init.body);
      }
    }
    console.log('=== End Request ===\n');
    
    const response = await fetch(url, init);
    
    // Log response headers
    console.log('\n=== AI SDK HTTP Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    // Clone response to read body without consuming it
    const clonedResponse = response.clone();
    
    // Try to read first few chunks if it's a stream
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('📡 Stream response - logging first few events...');
      const reader = clonedResponse.body?.getReader();
      const decoder = new TextDecoder();
      let count = 0;
      
      if (reader) {
        try {
          while (count < 3) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            console.log(`📦 Stream chunk ${count}:`, chunk.substring(0, 200));
            count++;
          }
          reader.releaseLock();
        } catch (e) {
          console.log('⚠️ Error reading stream:', e);
        }
      }
    }
    
    console.log('=== End Response ===\n');
    
    return response;
  };
};

export function createAIProvider(provider: Provider, reasoningEffort?: string) {
  if (!provider.api_key) {
    throw new Error(`API key not configured for provider: ${provider.name}`);
  }

  const customFetch = createLoggingFetch(provider.id, reasoningEffort);

  switch (provider.type) {
    case 'openai_compatible':
      // Use official OpenAI SDK for: OpenAI itself, or any provider using responses format
      if (provider.id === 'openai' || provider.api_format === 'responses') {
        return createOpenAI({
          baseURL: provider.base_url,
          apiKey: provider.api_key,
          fetch: customFetch,
        });
      }
      return createOpenAICompatible({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
        name: provider.id,
        fetch: customFetch,
      });
    case 'anthropic':
      return createAnthropic({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
        fetch: customFetch,
      });
    case 'google':
      return createGoogleGenerativeAI({
        baseURL: provider.base_url,
        apiKey: provider.api_key,
        fetch: customFetch,
      });
    default:
      throw new Error(`Unknown provider type: ${(provider as Provider).type}`);
  }
}

export function getLanguageModel(provider: Provider, modelId: string, reasoningEffort?: string) {
  const aiProvider = createAIProvider(provider, reasoningEffort);

  console.log('Creating language model:', { providerId: provider.id, modelId, reasoningEffort, apiFormat: provider.api_format });

  // Use responses() method when provider is configured for responses format
  if (provider.api_format === 'responses') {
    return (aiProvider as { responses: (id: string) => unknown }).responses(modelId);
  }

  // For all openai_compatible providers (including OpenAI), explicitly use .chat() for completions
  // The default callable of createOpenAI now uses Responses API, so we must use .chat() explicitly
  if (provider.type === 'openai_compatible') {
    return (aiProvider as { chat: (id: string) => unknown }).chat(modelId);
  }

  return (aiProvider as (id: string) => unknown)(modelId);
}
