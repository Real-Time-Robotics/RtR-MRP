// =============================================================================
// RTR MRP - DATABASE SETUP API
// Creates initial admin user if none exists
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { logger } from '@/lib/logger';
import { checkWriteEndpointLimit } from '@/lib/rate-limit';

// Create a new PrismaClient instance to avoid connection issues
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await checkWriteEndpointLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Check if any users exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return NextResponse.json({
        success: true,
        message: "Database already initialized",
        usersExist: true,
        userCount,
      });
    }

    // No users exist - create admin user
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!defaultPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "SEED_ADMIN_PASSWORD environment variable is required for initial setup",
        },
        { status: 500 }
      );
    }
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    await prisma.user.create({
      data: {
        email: "admin@rtr.com",
        name: "Admin User",
        password: hashedPassword,
        role: "admin",
        status: "active",
      },
    });

    // Also create a warehouse if none exists
    const warehouseCount = await prisma.warehouse.count();
    if (warehouseCount === 0) {
      await prisma.warehouse.create({
        data: {
          code: "WH-MAIN",
          name: "Main Warehouse",
          location: "Default Location",
          type: "MAIN",
          status: "active",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully. Check server logs or environment for default credentials.",
    });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/setup' });
    return NextResponse.json(
      {
        success: false,
        error: "Setup failed",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
