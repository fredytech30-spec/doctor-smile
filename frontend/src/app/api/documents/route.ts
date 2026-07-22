import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');
    
    if (analysisId) {
      const response = await api.analyses.getById(analysisId);
      return NextResponse.json(response);
    }
    
    return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const analysisId = formData.get('analysisId') as string;
    const file = formData.get('file') as File;
    
    const response = await api.analyses.uploadDocument(analysisId, file);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
