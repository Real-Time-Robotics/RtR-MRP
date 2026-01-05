// Debug endpoint to test login - REMOVE AFTER DEBUGGING
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('[DEBUG] Testing login for:', email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        status: true,
        failedLoginCount: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        debug: { email }
      });
    }

    if (user.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'User not active',
        debug: { status: user.status }
      });
    }

    if (!user.password) {
      return NextResponse.json({
        success: false,
        error: 'No password set',
      });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);

    return NextResponse.json({
      success: isValid,
      message: isValid ? 'Password matches!' : 'Password does not match',
      debug: {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        passwordLength: user.password.length,
        inputPasswordLength: password.length,
        failedLoginCount: user.failedLoginCount,
        lockedUntil: user.lockedUntil,
      }
    });

  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
