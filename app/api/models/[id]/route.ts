import { NextResponse } from 'next/server';
import { getModel, updateModel, deleteModel } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const model = getModel(params.id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    return NextResponse.json(model);
  } catch (error: unknown) {
    console.error('GET /api/models/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch model' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const model = getModel(params.id);
    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }
    const body = await req.json();
    updateModel(params.id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PUT /api/models/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update model';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteModel(params.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/models/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
