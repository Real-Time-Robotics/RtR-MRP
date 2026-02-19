import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';
import { logger } from '@/lib/logger';

const employeePutSchema = z.object({
  employeeCode: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  status: z.string().optional(),
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
  hourlyRate: z.number().min(0).optional(),
  overtimeRate: z.number().min(0).optional(),
  maxHoursPerWeek: z.number().int().positive().optional(),
}).passthrough();

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';
// GET - Get employee by ID with skills
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees/[id]' });
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
});

// PUT - Update employee
export const PUT = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
    const body = await request.json();
    const parsed = employeePutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu không hợp lệ', errors: parsed.error.issues },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        terminationDate: data.terminationDate ? new Date(data.terminationDate) : undefined,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees/[id]' });
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
});

// PATCH - Manage employee skills
export const PATCH = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;
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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees/[id]' });
    return NextResponse.json(
      { error: "Failed to manage employee skills" },
      { status: 500 }
    );
  }
});

// DELETE - Delete employee
export const DELETE = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const { id } = await context.params;

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
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees/[id]' });
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
});
