import { streamText, type UIMessage } from 'ai';

type CoreMessage = { role: 'user' | 'assistant' | 'system'; content: string };
import { getModel, getProvider } from '@/lib/db';
import { getLanguageModel } from '@/lib/ai';

export const maxDuration = 60;

// Convert UIMessage to CoreMessage format
function convertUIMessagesToCoreMessages(uiMessages: UIMessage[]): CoreMessage[] {
  return uiMessages.map((msg) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      // Collect all text parts
      const textParts = msg.parts?.filter(p => p.type === 'text').map(p => p.text) || [];
      const content = textParts.join('\n');
      
      return {
        role: msg.role,
        content,
      };
    }
    
    // Fallback for other roles
    return {
      role: msg.role,
      content: '',
    } as CoreMessage;
  });
}

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      modelId, 
      reasoningEffort,
      chatConfig,
    }: { 
      messages: UIMessage[]; 
      modelId: string;
      reasoningEffort?: string;
      chatConfig?: {
        systemPrompt?: string;
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
      };
    } = await req.json();

    console.log('=== Chat API Request ===');
    console.log('Model ID:', modelId);
    console.log('Reasoning Effort:', reasoningEffort);
    console.log('Chat Config:', chatConfig);
    console.log('Messages count:', messages.length);

    if (!modelId) {
      return new Response(JSON.stringify({ error: 'No model selected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const model = getModel(modelId);
    if (!model) {
      return new Response(JSON.stringify({ error: `Model "${modelId}" not found` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const provider = getProvider(model.provider_id);
    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!provider.api_key) {
      return new Response(
        JSON.stringify({ error: `API key not configured for ${provider.name}. Please add it in Settings.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const languageModel = getLanguageModel(provider, model.id, reasoningEffort);

    // Convert UIMessage[] to CoreMessage[] format
    const coreMessages = convertUIMessagesToCoreMessages(messages);

    // Inject system prompt if provided
    const finalMessages: CoreMessage[] = [];
    if (chatConfig?.systemPrompt) {
      finalMessages.push({
        role: 'system',
        content: chatConfig.systemPrompt,
      });
    }
    finalMessages.push(...coreMessages);

    // Build streamText options with custom config or model defaults
    const streamOptions: {
      model: unknown;
      messages: CoreMessage[];
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      experimental_providerMetadata?: Record<string, unknown>;
    } = {
      model: languageModel,
      messages: finalMessages,
      temperature: chatConfig?.temperature ?? model.temperature,
      maxTokens: chatConfig?.maxTokens ?? model.max_tokens,
      topP: chatConfig?.topP,
      frequencyPenalty: chatConfig?.frequencyPenalty,
      presencePenalty: chatConfig?.presencePenalty,
    };

    // Add reasoning effort if model supports it
    // Use experimental_providerMetadata to pass custom parameters
    if (model.is_reasoning_model && reasoningEffort) {
      console.log('Adding reasoning effort via providerMetadata:', reasoningEffort);
      streamOptions.experimental_providerMetadata = {
        reasoning_effort: reasoningEffort,
        // Also try the camelCase version
        reasoningEffort: reasoningEffort,
      };
    }

    console.log('Stream options (without model object):', {
      messages: finalMessages.length + ' messages',
      hasSystemPrompt: !!chatConfig?.systemPrompt,
      temperature: streamOptions.temperature,
      maxTokens: streamOptions.maxTokens,
      topP: streamOptions.topP,
      frequencyPenalty: streamOptions.frequencyPenalty,
      presencePenalty: streamOptions.presencePenalty,
      experimental_providerMetadata: streamOptions.experimental_providerMetadata,
    });

    const result = streamText(streamOptions as never);

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('Chat error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
