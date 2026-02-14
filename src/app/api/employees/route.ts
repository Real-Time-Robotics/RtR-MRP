import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

const ALLOWED_FILTERS = ["status", "department", "employmentType", "defaultWorkCenterId"];
const SEARCH_FIELDS = ["employeeCode", "firstName", "lastName", "email"];

// GET - List employees
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const withSkills = searchParams.get("withSkills") === "true";

    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    const where = { ...filters, ...searchQuery };

    const [totalCount, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { lastName: "asc" },
        include: withSkills
          ? {
              skills: {
                include: {
                  skill: {
                    select: { id: true, code: true, name: true, category: true },
                  },
                },
              },
              _count: {
                select: { shiftAssignments: true },
              },
            }
          : {
              _count: {
                select: { skills: true, shiftAssignments: true },
              },
            },
      }),
    ]);

    const response = buildPaginatedResponse(employees, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees' });
    return paginatedError("Failed to fetch employees", 500);
  }
}

// POST - Create employee
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      employmentType,
      hireDate,
      defaultWorkCenterId,
      shiftPattern,
      hourlyRate,
      overtimeRate,
      certifications,
      emergencyContact,
      emergencyPhone,
    } = body;

    // Validate required fields
    if (!employeeCode || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: employeeCode, firstName, lastName" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        firstName,
        lastName,
        email,
        phone,
        department,
        position,
        employmentType: employmentType || "full_time",
        hireDate: hireDate ? new Date(hireDate) : null,
        defaultWorkCenterId,
        shiftPattern,
        hourlyRate,
        overtimeRate,
        certifications,
        emergencyContact,
        emergencyPhone,
        status: "active",
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/employees' });
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
