import { NextResponse } from 'next/server';
import { getConversation, updateConversation, deleteConversation } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const conversation = getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    return NextResponse.json(conversation);
  } catch (error: unknown) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const conversation = getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const body = await req.json();
    updateConversation(id, body);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PUT /api/conversations/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('DELETE /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
