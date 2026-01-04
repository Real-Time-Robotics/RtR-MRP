import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET - Get employee by ID with skills
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

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            skill: true,
          },
          orderBy: { level: "desc" },
        },
        shiftAssignments: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
          orderBy: { date: "asc" },
          take: 14,
          include: {
            shift: {
              select: { id: true, code: true, name: true, startTime: true, endTime: true },
            },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Get employee error:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PUT - Update employee
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

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...body,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        terminationDate: body.terminationDate ? new Date(body.terminationDate) : undefined,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// PATCH - Manage employee skills
export async function PATCH(
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
    const { action, skillId, ...skillData } = body;

    switch (action) {
      case "addSkill":
        const newSkill = await prisma.employeeSkill.create({
          data: {
            employeeId: id,
            skillId,
            level: skillData.level || 1,
            proficiency: skillData.proficiency || "beginner",
            trainedDate: skillData.trainedDate ? new Date(skillData.trainedDate) : null,
            trainedBy: skillData.trainedBy,
            certifiedDate: skillData.certifiedDate ? new Date(skillData.certifiedDate) : null,
            certificationExpiry: skillData.certificationExpiry
              ? new Date(skillData.certificationExpiry)
              : null,
            certificateNumber: skillData.certificateNumber,
            notes: skillData.notes,
          },
          include: { skill: true },
        });
        return NextResponse.json(newSkill);

      case "updateSkill":
        const updatedSkill = await prisma.employeeSkill.update({
          where: {
            employeeId_skillId: {
              employeeId: id,
              skillId,
            },
          },
          data: {
            level: skillData.level,
            proficiency: skillData.proficiency,
            lastAssessedDate: skillData.lastAssessedDate
              ? new Date(skillData.lastAssessedDate)
              : null,
            assessedBy: skillData.assessedBy,
            assessmentScore: skillData.assessmentScore,
            notes: skillData.notes,
          },
          include: { skill: true },
        });
        return NextResponse.json(updatedSkill);

      case "removeSkill":
        await prisma.employeeSkill.delete({
          where: {
            employeeId_skillId: {
              employeeId: id,
              skillId,
            },
          },
        });
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Manage employee skills error:", error);
    return NextResponse.json(
      { error: "Failed to manage employee skills" },
      { status: 500 }
    );
  }
}

// DELETE - Delete employee
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

    // Soft delete by setting status to terminated
    await prisma.employee.update({
      where: { id },
      data: {
        status: "terminated",
        terminationDate: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
