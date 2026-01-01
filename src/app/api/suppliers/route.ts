import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  parsePaginationParams,
  buildOffsetPaginationQuery,
  buildPaginatedResponse,
  buildSearchQuery,
  paginatedSuccess,
  paginatedError,
} from "@/lib/pagination";

const SEARCH_FIELDS = ["name", "code", "email", "contactName"];

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse pagination params
    const params = parsePaginationParams(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    // Build where clause
    const searchQuery = buildSearchQuery(search, SEARCH_FIELDS);
    const where = {
      ...searchQuery,
      ...(status && { status }),
    };

    // Get total count and paginated data in parallel
    const [totalCount, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        ...buildOffsetPaginationQuery(params),
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder }
          : { name: "asc" },
      }),
    ]);

    return paginatedSuccess(
      buildPaginatedResponse(suppliers, totalCount, params, startTime)
    );
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return paginatedError("Failed to fetch suppliers", 500);
  }
}
