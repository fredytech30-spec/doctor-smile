import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await api.auth.verifyOTP(body.email, body.otp);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 400 }
    );
  }
}
