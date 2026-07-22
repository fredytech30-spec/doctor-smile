import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await api.analyses.getById(id);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const response = await api.analyses.update(id, body);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Failed to update analysis' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await api.analyses.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 });
  }
}
