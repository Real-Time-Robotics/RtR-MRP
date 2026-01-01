// =============================================================================
// RTR MRP - DATABASE SETUP API
// Creates initial admin user if none exists
// =============================================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Create a new PrismaClient instance to avoid connection issues
const prisma = new PrismaClient();

export async function GET() {
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
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "admin123456@";
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
          type: "mixed",
          status: "active",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      credentials: {
        email: "admin@rtr.com",
        password: defaultPassword,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Setup failed",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
