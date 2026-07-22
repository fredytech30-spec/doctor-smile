import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET() {
  try {
    const response = await api.dashboard.getStats();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
