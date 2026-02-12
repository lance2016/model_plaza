import { NextResponse } from 'next/server';
import { getAllSettings, setSetting, clearAllConversations } from '@/lib/db';

export async function GET() {
  try {
    const settings = getAllSettings();
    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'Missing required field: key' }, { status: 400 });
    }
    
    setSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('PUT /api/settings error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;
    
    if (action === 'clear_conversations') {
      clearAllConversations();
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    console.error('POST /api/settings error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
