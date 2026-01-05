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
      select: { id: true, email: true, name: true, status: true }
    });

    if (existingUser) {
      // Update password to ensure it's correct
      const hashedPassword = await bcrypt.hash(demoPassword, 12);
      await prisma.user.update({
        where: { email: demoEmail },
        data: {
          password: hashedPassword,
          status: "active"
        }
      });

      return NextResponse.json({
        success: true,
        message: "Demo user exists, password updated",
        user: existingUser
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
