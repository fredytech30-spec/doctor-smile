import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await api.auth.resetPassword(body.email);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 400 }
    );
  }
}
