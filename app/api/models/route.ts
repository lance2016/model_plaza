import { NextResponse } from 'next/server';
import { getAllModels, getEnabledModels, getModelsByProvider, createModel } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get('provider_id');
    const enabledOnly = searchParams.get('enabled') === 'true';

    let models;
    if (enabledOnly) {
      models = getEnabledModels();
    } else if (providerId) {
      models = getModelsByProvider(providerId);
    } else {
      models = getAllModels();
    }
    return NextResponse.json(models);
  } catch (error: unknown) {
    console.error('GET /api/models error:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, provider_id, name, enabled, temperature, max_tokens, sort_order } = body;
    if (!id || !provider_id || !name) {
      return NextResponse.json({ error: 'Missing required fields: id, provider_id, name' }, { status: 400 });
    }
    createModel({ id, provider_id, name, enabled, temperature, max_tokens, sort_order });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('POST /api/models error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create model';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
