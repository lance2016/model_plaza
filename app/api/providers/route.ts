import { NextResponse } from 'next/server';
import { getAllProviders, createProvider } from '@/lib/db';

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return '****' + key.slice(-4);
}

export async function GET() {
  try {
    const providers = getAllProviders().map(p => ({
      ...p,
      api_key: maskApiKey(p.api_key),
      has_api_key: !!p.api_key,
    }));
    return NextResponse.json(providers);
  } catch (error: unknown) {
    console.error('GET /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, base_url, api_key, api_format, enabled, sort_order } = body;
    if (!id || !name || !type || !base_url) {
      return NextResponse.json({ error: 'Missing required fields: id, name, type, base_url' }, { status: 400 });
    }
    if (!['openai_compatible', 'anthropic', 'google'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be: openai_compatible, anthropic, or google' }, { status: 400 });
    }
    createProvider({ id, name, type, base_url, api_key, api_format, enabled, sort_order });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('POST /api/providers error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create provider';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
