import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "user-1", name: "Test User", role: "admin" } })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkReadEndpointLimit: vi.fn(() => null),
  checkWriteEndpointLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: { logError: vi.fn() },
}));

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    substituteEvaluation: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    part: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

import { GET, POST } from "@/app/api/cost-optimization/substitutes/route";

function makeRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as any);
}

describe("GET /api/cost-optimization/substitutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated evaluations", async () => {
    mockFindMany.mockResolvedValue([{ id: "e1" }]);
    mockCount.mockResolvedValue(1);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/substitutes");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });

  it("supports search filter", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/substitutes?search=GPS");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    await handler(req, { params: Promise.resolve({}) });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              originalPart: expect.objectContaining({
                partNumber: expect.objectContaining({ contains: "GPS" }),
              }),
            }),
          ]),
        }),
      })
    );
  });
});

describe("POST /api/cost-optimization/substitutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates evaluation with pricing and risk", async () => {
    mockFindUnique
      .mockResolvedValueOnce({ unitCost: 280, ndaaCompliant: true, leadTimeDays: 14 })
      .mockResolvedValueOnce({ unitCost: 85, ndaaCompliant: true, leadTimeDays: 7 });

    const createdEval = {
      id: "eval-1",
      originalPartId: "p1",
      substitutePartId: "p2",
      savingsPercent: 69.64,
      originalPart: { id: "p1", partNumber: "PRT-001", name: "Original" },
      substitutePart: { id: "p2", partNumber: "PRT-002", name: "Sub" },
    };
    mockCreate.mockResolvedValue(createdEval);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/substitutes", "POST", {
      originalPartId: "p1",
      substitutePartId: "p2",
    });
    const handler = POST as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalPartId: "p1",
          substitutePartId: "p2",
          status: "IDENTIFIED",
        }),
      })
    );
  });

  it("returns 400 when part IDs are missing", async () => {
    const req = makeRequest("http://localhost:3000/api/cost-optimization/substitutes", "POST", {});
    const handler = POST as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });

  it("returns 404 when parts not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/substitutes", "POST", {
      originalPartId: "nonexistent",
      substitutePartId: "also-nonexistent",
    });
    const handler = POST as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(404);
  });
});
