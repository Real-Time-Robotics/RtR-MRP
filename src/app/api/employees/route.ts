import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from '@/lib/api/with-auth';import { logger } from '@/lib/logger';

import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildFilterQuery,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

import { checkReadEndpointLimit, checkWriteEndpointLimit } from '@/lib/rate-limit';

const employeeBodySchema = z.object({
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  employmentType: z.string().optional(),
  hireDate: z.string().optional(),
  defaultWorkCenterId: z.string().optional(),
  shiftPattern: z.string().optional(),
  hourlyRate: z.number().optional(),
  overtimeRate: z.number().optional(),
  certifications: z.any().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

const ALLOWED_FILTERS = ["status", "department", "employmentType", "defaultWorkCenterId"];
const SEARCH_FIELDS = ["employeeCode", "firstName", "lastName", "email"];

// GET - List employees
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {
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
});

// POST - Create employee
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {
const rawBody = await request.json();
    const parseResult = employeeBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
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
    } = parseResult.data;

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
});
