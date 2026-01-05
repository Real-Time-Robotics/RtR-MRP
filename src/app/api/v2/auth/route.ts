// =============================================================================
// RTR MRP - AUTH API ROUTES
// Password management, account settings, MFA
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z
    .string()
    .min(12, 'Mật khẩu mới phải có ít nhất 12 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ in hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
});

// =============================================================================
// POST HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'change-password':
        return handleChangePassword(session.user, body);
      case 'update-profile':
        return handleUpdateProfile(session.user, body);
      case 'enable-mfa':
        return handleEnableMFA(session.user);
      case 'disable-mfa':
        return handleDisableMFA(session.user, body);
      case 'verify-mfa':
        return handleVerifyMFA(session.user, body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[AUTH API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET CURRENT USER
// =============================================================================

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: unknown) {
    console.error('[AUTH API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

async function handleChangePassword(user: { id?: string; email?: string | null }, body: unknown) {
  // Validate input
  const validation = changePasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        errors: validation.error.issues
      },
      { status: 400 }
    );
  }

  const { currentPassword, newPassword } = validation.data;

  if (!user.id) {
    return NextResponse.json(
      { success: false, error: 'User ID not found' },
      { status: 400 }
    );
  }

  // Get user with password
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, password: true },
  });

  if (!dbUser || !dbUser.password) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  // Verify current password
  const validPassword = await bcrypt.compare(currentPassword, dbUser.password);
  if (!validPassword) {
    return NextResponse.json(
      { success: false, error: 'Mật khẩu hiện tại không đúng' },
      { status: 400 }
    );
  }

  // Check if new password is same as current
  const samePassword = await bcrypt.compare(newPassword, dbUser.password);
  if (samePassword) {
    return NextResponse.json(
      { success: false, error: 'Mật khẩu mới không được trùng với mật khẩu cũ' },
      { status: 400 }
    );
  }

  // Hash and update new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    },
  });

  // Log audit event
  console.log(`[AUTH] Password changed for user: ${user.email}`);

  return NextResponse.json({
    success: true,
    message: 'Mật khẩu đã được thay đổi thành công',
  });
}

async function handleUpdateProfile(user: { id?: string }, body: unknown) {
  // Validate input
  const validation = updateProfileSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        errors: validation.error.issues
      },
      { status: 400 }
    );
  }

  const { name } = validation.data;

  if (!user.id) {
    return NextResponse.json(
      { success: false, error: 'User ID not found' },
      { status: 400 }
    );
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { name },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Thông tin cá nhân đã được cập nhật',
    data: updatedUser,
  });
}

async function handleEnableMFA(user: { id?: string; email?: string | null }) {
  if (!user.id) {
    return NextResponse.json(
      { success: false, error: 'User ID not found' },
      { status: 400 }
    );
  }

  // For demo, we'll return a placeholder secret
  // In production, use speakeasy to generate a real secret
  const secret = {
    base32: 'JBSWY3DPEHPK3PXP', // Demo secret
    otpauth_url: `otpauth://totp/RTR%20MRP:${user.email}?secret=JBSWY3DPEHPK3PXP&issuer=RTR%20MRP`,
  };

  // Store pending MFA (not enabled yet until verified)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaMethod: 'totp',
      mfaEnabled: false, // Will be enabled after verification
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
    },
  });
}

async function handleVerifyMFA(user: { id?: string; email?: string | null }, body: { code?: string }) {
  const { code } = body;

  if (!code || code.length !== 6) {
    return NextResponse.json(
      { success: false, error: 'Mã xác thực không hợp lệ' },
      { status: 400 }
    );
  }

  if (!user.id) {
    return NextResponse.json(
      { success: false, error: 'User ID not found' },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaMethod: true },
  });

  if (!dbUser?.mfaMethod) {
    return NextResponse.json(
      { success: false, error: 'MFA chưa được khởi tạo' },
      { status: 400 }
    );
  }

  // For demo, accept any 6-digit code
  // In production, use speakeasy to verify TOTP
  const verified = /^\d{6}$/.test(code);

  if (!verified) {
    return NextResponse.json(
      { success: false, error: 'Mã xác thực không đúng' },
      { status: 400 }
    );
  }

  // Enable MFA
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  console.log(`[AUTH] MFA enabled for user: ${user.email}`);

  return NextResponse.json({
    success: true,
    message: 'Xác thực 2 bước đã được kích hoạt',
  });
}

async function handleDisableMFA(user: { id?: string; email?: string | null }, body: { password?: string }) {
  const { password } = body;

  if (!user.id) {
    return NextResponse.json(
      { success: false, error: 'User ID not found' },
      { status: 400 }
    );
  }

  // Verify password
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true, mfaEnabled: true },
  });

  if (!dbUser?.password) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  if (!dbUser.mfaEnabled) {
    return NextResponse.json(
      { success: false, error: 'MFA chưa được kích hoạt' },
      { status: 400 }
    );
  }

  if (!password) {
    return NextResponse.json(
      { success: false, error: 'Vui lòng nhập mật khẩu' },
      { status: 400 }
    );
  }

  const validPassword = await bcrypt.compare(password, dbUser.password);
  if (!validPassword) {
    return NextResponse.json(
      { success: false, error: 'Mật khẩu không đúng' },
      { status: 400 }
    );
  }

  // Disable MFA
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaMethod: null,
    },
  });

  console.log(`[AUTH] MFA disabled for user: ${user.email}`);

  return NextResponse.json({
    success: true,
    message: 'Xác thực 2 bước đã được tắt',
  });
}
