import { NextResponse } from 'next/server';
import { searchConversations } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const mode = searchParams.get('mode') as 'model' | 'agent' | null;

    if (!query || query.trim() === '') {
      return NextResponse.json([]);
    }

    const conversations = searchConversations(query, mode || undefined);
    return NextResponse.json(conversations);
  } catch (error: unknown) {
    console.error('GET /api/conversations/search error:', error);
    return NextResponse.json({ error: 'Failed to search conversations' }, { status: 500 });
  }
}
