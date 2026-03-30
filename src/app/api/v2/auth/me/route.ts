// =============================================================================
// RTR MRP — GET CURRENT USER ENDPOINT
// Lightweight endpoint for client-side RtrAuthProvider to fetch user info
// =============================================================================

import { NextResponse } from 'next/server';
import { getRtrSession } from '@/lib/auth-gateway/verify';

export async function GET() {
  try {
    const session = await getRtrSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session.user,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Auth verification failed' },
      { status: 500 }
    );
  }
}
