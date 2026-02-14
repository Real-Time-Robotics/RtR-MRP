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

const ALLOWED_FILTERS = ["category", "workCenterType", "isActive"];
const SEARCH_FIELDS = ["code", "name"];

// GET - List skills (skill matrix)
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
}

// POST - Create skill
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!code || !name || !category) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, category" },
        { status: 400 }
      );
    }

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
}
