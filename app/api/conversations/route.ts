import { NextResponse } from 'next/server';
import { getAllConversations, createConversation } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const conversations = getAllConversations();
    return NextResponse.json(conversations);
  } catch (error: unknown) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { model_id, title, messages } = body;
    if (!model_id) {
      return NextResponse.json({ error: 'Missing required field: model_id' }, { status: 400 });
    }
    const id = uuidv4();
    createConversation({ id, model_id, title, messages });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('POST /api/conversations error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
