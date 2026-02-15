import { streamText, tool, jsonSchema, stepCountIs, type UIMessage } from 'ai';

type ContentPart = { type: 'text'; text: string } | { type: 'image'; image: string; mimeType?: string };
type CoreMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
};

import { getModel, getProvider, getSetting } from '@/lib/db';
import { getLanguageModel } from '@/lib/ai';

export const maxDuration = 60;

// Build system context with current time and other info
function buildSystemContext(userLocation?: { latitude: number; longitude: number; city?: string; country?: string }): string {
  const now = new Date();
  
  // Format time in user-friendly way
  const dateStr = now.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
  
  const timeStr = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  let context = `[系统信息]\n当前时间: ${dateStr} ${timeStr}`;
  
  // Add timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  context += `\n时区: ${timezone}`;
  
  // Add location if provided
  if (userLocation) {
    context += `\n用户位置: `;
    if (userLocation.city && userLocation.country) {
      context += `${userLocation.country} ${userLocation.city}`;
    }
    context += `\n经纬度: (${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)})`;
  }
  
  return context;
}

// Convert UIMessage to CoreMessage format, extracting file parts as images
function convertUIMessagesToCoreMessages(uiMessages: UIMessage[]): CoreMessage[] {
  return uiMessages.map((msg) => {
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { role: msg.role, content: '' } as CoreMessage;
    }

    const textParts = msg.parts?.filter(p => p.type === 'text').map(p => p.text) || [];
    const text = textParts.join('\n');

    // Collect image file parts
    const fileParts = (msg.parts?.filter(p => p.type === 'file') || []) as Array<{
      type: 'file';
      url?: string;
      data?: string;
      mimeType?: string;
      mediaType?: string;
    }>;
    const imageParts = fileParts.filter(p => {
      const mime = p.mimeType || p.mediaType || '';
      return mime.startsWith('image/');
    });

    if (imageParts.length > 0) {
      const contentParts: ContentPart[] = [];
      if (text) {
        contentParts.push({ type: 'text', text });
      }
      imageParts.forEach(img => {
        const imageUrl = img.url || img.data || '';
        if (imageUrl) {
          contentParts.push({
            type: 'image',
            image: imageUrl,
            mimeType: img.mimeType || img.mediaType,
          });
        }
      });
      return { role: msg.role, content: contentParts };
    }

    return { role: msg.role, content: text };
  });
}

// Log message with image placeholders (avoid printing full base64)
function logMessageSafely(msg: CoreMessage) {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }

  const safeContent = msg.content.map(part => {
    if (part.type === 'image') {
      const prefix = part.image.substring(0, 50);
      return { type: 'image', preview: `${prefix}...`, mimeType: part.mimeType };
    }
    return part;
  });

  return { role: msg.role, content: safeContent };
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      modelId,
      reasoningEffort,
      chatConfig,
      agentId,
      enabledTools,
      userLocation,
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
      agentId?: string;
      enabledTools?: string[]; // Array of enabled tool names
      userLocation?: {
        latitude: number;
        longitude: number;
        city?: string;
        country?: string;
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

    const languageModel = getLanguageModel(provider, model.id, model.is_reasoning_model ? reasoningEffort : undefined);

    // Convert UIMessage[] to CoreMessage[] (images extracted from file parts)
    const coreMessages = convertUIMessagesToCoreMessages(messages);

    // Log messages safely (with image placeholders)
    console.log('Core messages:', coreMessages.map(logMessageSafely));

    // Build system prompt: merge global prompt + per-chat prompt + system context
    const globalPromptEnabled = getSetting('global_system_prompt_enabled') === 'true';
    const globalPrompt = globalPromptEnabled ? (getSetting('global_system_prompt') || '') : '';
    const chatPrompt = chatConfig?.systemPrompt || '';
    
    // Build system context (time, location, etc)
    const systemContext = buildSystemContext(userLocation);

    const finalMessages: CoreMessage[] = [];
    if (globalPrompt || chatPrompt || systemContext) {
      let systemContent = '';
      
      // Add system context first
      if (systemContext) {
        systemContent = systemContext;
      }
      
      // Add chat prompt
      if (chatPrompt) {
        systemContent += systemContent ? '\n\n' : '';
        systemContent += chatPrompt;
      }
      
      // Add global prompt (highest priority)
      if (globalPrompt) {
        systemContent += systemContent ? '\n\n---\n以下是用户自定义的全局提示词，优先级最高，如与上述内容冲突请以此为准：\n' : '';
        systemContent += globalPrompt;
      }
      
      finalMessages.push({
        role: 'system',
        content: systemContent,
      });
    }
    finalMessages.push(...coreMessages);

    // Build tools map if agent session and Tavily key is configured
    const tavilyApiKey = agentId ? getSetting('tavily_api_key') : undefined;
    const tools = tavilyApiKey ? {
      web_search: tool({
        description: '搜索互联网获取最新信息。当用户询问实时信息、最新事件、需要验证的事实时使用。',
        inputSchema: jsonSchema<{ query: string }>({
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词，使用简洁准确的关键词' },
          },
          required: ['query'],
        }),
        execute: async ({ query }: { query: string }) => {
          console.log('🔍 Web search:', query);
          try {
            const res = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: tavilyApiKey,
                query,
                max_results: 5,
                include_answer: true,
              }),
            });
            if (!res.ok) {
              const err = await res.text();
              console.error('Tavily error:', err);
              return { error: '搜索失败，请稍后重试' };
            }
            const data = await res.json();
            return {
              answer: data.answer || '',
              results: (data.results || []).map((r: { title: string; url: string; content: string }) => ({
                title: r.title,
                url: r.url,
                content: r.content,
              })),
            };
          } catch (e) {
            console.error('Web search error:', e);
            return { error: '搜索请求失败' };
          }
        },
      });
    }

    // Build streamText options with custom config or model defaults
    const streamOptions: Record<string, unknown> = {
      model: languageModel,
      messages: finalMessages,
      temperature: chatConfig?.temperature ?? model.temperature,
      maxTokens: chatConfig?.maxTokens ?? model.max_tokens,
      topP: chatConfig?.topP,
      frequencyPenalty: chatConfig?.frequencyPenalty,
      presencePenalty: chatConfig?.presencePenalty,
    };

    if (Object.keys(tools).length > 0) {
      streamOptions.tools = tools;
      streamOptions.stopWhen = stepCountIs(3);
    }

    // Add reasoning effort if model supports it
    if (model.is_reasoning_model && reasoningEffort) {
      console.log('Adding reasoning effort via providerMetadata:', reasoningEffort);
      streamOptions.experimental_providerMetadata = {
        reasoning_effort: reasoningEffort,
        reasoningEffort: reasoningEffort,
      };
    }

    console.log('Stream options (without model object):', {
      messages: finalMessages.length + ' messages',
      hasSystemPrompt: !!chatConfig?.systemPrompt,
      hasGlobalPrompt: !!globalPrompt,
      temperature: streamOptions.temperature,
      maxTokens: streamOptions.maxTokens,
      hasTools: Object.keys(tools).length > 0,
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
