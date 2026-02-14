import { NextResponse } from 'next/server';
import { getAllAgents, searchAgents, createAgent, getDefaultAgent } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    const defaultOnly = searchParams.get('default') === 'true';
    if (defaultOnly) {
      const agent = getDefaultAgent();
      return NextResponse.json(agent || null);
    }
    const agents = query ? searchAgents(query) : getAllAgents();
    return NextResponse.json(agents);
  } catch (error: unknown) {
    console.error('GET /api/agents error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, system_prompt } = body;
    if (!name || !system_prompt) {
      return NextResponse.json({ error: 'Missing required fields: name, system_prompt' }, { status: 400 });
    }
    const id = uuidv4();
    createAgent({ id, ...body });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('POST /api/agents error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
