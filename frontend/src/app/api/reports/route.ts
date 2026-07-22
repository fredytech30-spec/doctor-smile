import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const response = await api.reports.generate('placeholder', 'pdf');
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analysisId, format } = body;
    const response = await api.reports.generate(analysisId, format);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
