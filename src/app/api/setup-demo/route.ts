// API endpoint to setup demo user - can be called once after deploy
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const demoEmail = "demo@rtr-mrp.com";
    const demoPassword = "DemoMRP@2026!";

    // Check if demo user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: demoEmail },
      select: { id: true, email: true, name: true, status: true, password: true, failedLoginCount: true, lockedUntil: true }
    });

    if (existingUser) {
      // Test current password first
      let passwordWorks = false;
      if (existingUser.password) {
        passwordWorks = await bcrypt.compare(demoPassword, existingUser.password);
      }

      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(demoPassword, 12);
      await prisma.user.update({
        where: { email: demoEmail },
        data: {
          password: hashedPassword,
          status: "active",
          failedLoginCount: 0,
          lockedUntil: null,
          mfaEnabled: false
        }
      });

      // Verify new password works
      const verifyUser = await prisma.user.findUnique({
        where: { email: demoEmail },
        select: { password: true }
      });
      const newPasswordWorks = verifyUser?.password ? await bcrypt.compare(demoPassword, verifyUser.password) : false;

      return NextResponse.json({
        success: true,
        message: "Demo user exists, password updated",
        user: { id: existingUser.id, email: existingUser.email, name: existingUser.name, status: existingUser.status },
        debug: {
          oldPasswordWorked: passwordWorks,
          newPasswordWorks: newPasswordWorks,
          failedLoginCount: existingUser.failedLoginCount,
          wasLocked: !!existingUser.lockedUntil
        },
        env: {
          NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
          NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }

    // Create demo user
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    const newUser = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Demo User",
        password: hashedPassword,
        role: "admin",
        status: "active",
      },
      select: { id: true, email: true, name: true, status: true }
    });

    return NextResponse.json({
      success: true,
      message: "Demo user created",
      user: newUser
    });

  } catch (error) {
    console.error('Setup demo error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
