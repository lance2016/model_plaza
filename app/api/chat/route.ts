import { streamText, type UIMessage } from 'ai';
import { getModel, getProvider } from '@/lib/db';
import { getLanguageModel } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, modelId }: { messages: UIMessage[]; modelId: string } = await req.json();

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

    const languageModel = getLanguageModel(provider, model.id);

    const result = streamText({
      model: languageModel,
      messages,
      temperature: model.temperature,
      maxTokens: model.max_tokens,
    });

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
