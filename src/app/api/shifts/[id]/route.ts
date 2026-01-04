import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Get shift by ID with assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const assignmentWhere: Record<string, unknown> = {};
    if (startDate && endDate) {
      assignmentWhere.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        assignments: {
          where: assignmentWhere,
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                firstName: true,
                lastName: true,
                department: true,
              },
            },
          },
          orderBy: [{ date: "asc" }, { employee: { lastName: "asc" } }],
        },
      },
    });

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Get shift error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shift" },
      { status: 500 }
    );
  }
}

// PUT - Update shift
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await prisma.shift.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error("Update shift error:", error);
    return NextResponse.json(
      { error: "Failed to update shift" },
      { status: 500 }
    );
  }
}

// PATCH - Manage shift assignments
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: shiftId } = await params;
    const body = await request.json();
    const { action, employeeId, date, ...assignmentData } = body;

    switch (action) {
      case "assign":
        // Assign employee to shift for a date
        const assignment = await prisma.shiftAssignment.upsert({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
          create: {
            employeeId,
            shiftId,
            date: new Date(date),
            assignmentType: assignmentData.assignmentType || "regular",
            status: "scheduled",
            plannedStart: assignmentData.plannedStart
              ? new Date(assignmentData.plannedStart)
              : null,
            plannedEnd: assignmentData.plannedEnd
              ? new Date(assignmentData.plannedEnd)
              : null,
          },
          update: {
            assignmentType: assignmentData.assignmentType,
            status: "scheduled",
          },
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true },
            },
            shift: {
              select: { id: true, code: true, name: true },
            },
          },
        });
        return NextResponse.json(assignment);

      case "clockIn":
        const clockIn = await prisma.shiftAssignment.update({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
          data: {
            status: "checked_in",
            actualStart: new Date(),
          },
        });
        return NextResponse.json(clockIn);

      case "clockOut":
        const existing = await prisma.shiftAssignment.findUnique({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
        });

        if (!existing || !existing.actualStart) {
          return NextResponse.json({ error: "Must clock in first" }, { status: 400 });
        }

        const actualEnd = new Date();
        const workedMs = actualEnd.getTime() - existing.actualStart.getTime();
        const workedHours = workedMs / (1000 * 60 * 60);

        const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
        const overtimeThreshold = shift?.overtimeAfterHours || 8;

        const regularHours = Math.min(workedHours, overtimeThreshold);
        const overtimeHours = Math.max(0, workedHours - overtimeThreshold);

        const clockOut = await prisma.shiftAssignment.update({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
          data: {
            status: "checked_out",
            actualEnd,
            regularHours,
            overtimeHours,
          },
        });
        return NextResponse.json(clockOut);

      case "markAbsent":
        const absent = await prisma.shiftAssignment.update({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
          data: {
            status: "absent",
          },
        });
        return NextResponse.json(absent);

      case "markLeave":
        const leave = await prisma.shiftAssignment.update({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
          data: {
            status: "leave",
            leaveType: assignmentData.leaveType,
            leaveApprovedBy: session.user?.email,
          },
        });
        return NextResponse.json(leave);

      case "remove":
        await prisma.shiftAssignment.delete({
          where: {
            employeeId_shiftId_date: {
              employeeId,
              shiftId,
              date: new Date(date),
            },
          },
        });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Manage shift assignment error:", error);
    return NextResponse.json(
      { error: "Failed to manage shift assignment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.shift.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete shift error:", error);
    return NextResponse.json(
      { error: "Failed to delete shift" },
      { status: 500 }
    );
  }
}
