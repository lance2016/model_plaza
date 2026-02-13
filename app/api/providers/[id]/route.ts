import { NextResponse } from 'next/server';
import { getProvider, updateProvider, deleteProvider } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const provider = getProvider(id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    return NextResponse.json({
      ...provider,
      api_key: provider.api_key ? '****' + provider.api_key.slice(-4) : '',
      has_api_key: !!provider.api_key,
    });
  } catch (error: unknown) {
    console.error('GET /api/providers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch provider' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const provider = getProvider(id);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    const body = await req.json();
    // Only pass known fields to updateProvider
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.base_url !== undefined) updates.base_url = body.base_url;
    if (body.api_key !== undefined) updates.api_key = body.api_key;
    if (body.api_format !== undefined) updates.api_format = body.api_format;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
    updateProvider(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PUT /api/providers/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update provider';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    deleteProvider(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/providers/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
