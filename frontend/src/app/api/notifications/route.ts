import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET() {
  try {
    const response = await api.notifications.getAll();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (id) {
      const response = await api.notifications.markAsRead(id);
      return NextResponse.json(response);
    }
    
    const response = await api.notifications.markAllAsRead();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
