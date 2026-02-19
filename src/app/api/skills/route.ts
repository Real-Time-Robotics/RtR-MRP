import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";
import { logger } from '@/lib/logger';

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

const skillBodySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  workCenterType: z.string().optional(),
  trainingRequired: z.boolean().optional(),
  certificationRequired: z.boolean().optional(),
  recertificationDays: z.number().optional(),
  hasLevels: z.boolean().optional(),
  maxLevel: z.number().optional(),
});

const ALLOWED_FILTERS = ["category", "workCenterType", "isActive"];
const SEARCH_FIELDS = ["code", "name"];

// GET - List skills (skill matrix)
export const GET = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkReadEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  const startTime = Date.now();

  try {

    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const matrix = searchParams.get("matrix") === "true";

    const filters = buildFilterQuery(request, ALLOWED_FILTERS);
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);

    const where = { ...filters, ...searchQuery };

    if (matrix) {
      // Return full skill matrix with employees
      const skills = await prisma.skill.findMany({
        where: { isActive: true },
        include: {
          employeeSkills: {
            include: {
              employee: {
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  department: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });

      return NextResponse.json({ skills, total: skills.length });
    }

    const [totalCount, skills] = await Promise.all([
      prisma.skill.count({ where }),
      prisma.skill.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : [{ category: "asc" }, { name: "asc" }],
        include: {
          _count: {
            select: { employeeSkills: true },
          },
        },
      }),
    ]);

    const response = buildPaginatedResponse(skills, totalCount, params, startTime);
    return paginatedSuccess(response);
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/skills' });
    return paginatedError("Failed to fetch skills", 500);
  }
});

// POST - Create skill
export const POST = withAuth(async (request, context, session) => {
    // Rate limiting
    const rateLimitResult = await checkWriteEndpointLimit(request);
    if (rateLimitResult) return rateLimitResult;

  try {

    const rawBody = await request.json();
    const parseResult = skillBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const {
      code,
      name,
      description,
      category,
      workCenterType,
      trainingRequired,
      certificationRequired,
      recertificationDays,
      hasLevels,
      maxLevel,
    } = parseResult.data;

    const skill = await prisma.skill.create({
      data: {
        code,
        name,
        description,
        category,
        workCenterType,
        trainingRequired: trainingRequired ?? true,
        certificationRequired: certificationRequired ?? false,
        recertificationDays,
        hasLevels: hasLevels ?? true,
        maxLevel: maxLevel || 5,
        isActive: true,
      },
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error) {
    logger.logError(error instanceof Error ? error : new Error(String(error)), { context: '/api/skills' });
    return NextResponse.json(
      { error: "Failed to create skill" },
      { status: 500 }
    );
  }
});
