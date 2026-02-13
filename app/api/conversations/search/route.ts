import { NextResponse } from 'next/server';
import { searchConversations } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim() === '') {
      return NextResponse.json([]);
    }
    
    const conversations = searchConversations(query);
    return NextResponse.json(conversations);
  } catch (error: unknown) {
    console.error('GET /api/conversations/search error:', error);
    return NextResponse.json({ error: 'Failed to search conversations' }, { status: 500 });
  }
}
