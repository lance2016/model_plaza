import { NextResponse } from 'next/server';
import { getAgent, incrementAgentUseCount } from '@/lib/db';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id);
    const agent = getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    incrementAgentUseCount(id);
    return NextResponse.json({ success: true, agent: { ...agent, use_count: agent.use_count + 1 } });
  } catch (error: unknown) {
    console.error('POST /api/agents/[id]/use error:', error);
    return NextResponse.json({ error: 'Failed to use agent' }, { status: 500 });
  }
}
