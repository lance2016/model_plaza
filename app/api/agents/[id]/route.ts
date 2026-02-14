import { NextResponse } from 'next/server';
import { getAgent, updateAgent, deleteAgent } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error: unknown) {
    console.error('GET /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    const body = await req.json();
    updateAgent(id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PUT /api/agents/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/agents/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
