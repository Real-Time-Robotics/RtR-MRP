import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
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

vi.mock("@/lib/prisma", () => ({
  default: {
    makeVsBuyAnalysis: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { GET, POST } from "@/app/api/cost-optimization/make-vs-buy/route";

function makeRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as any);
}

describe("GET /api/cost-optimization/make-vs-buy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated analyses list", async () => {
    const mockData = [
      { id: "a1", partId: "p1", recommendation: "STRONG_MAKE", overallScore: 8.6 },
    ];
    mockFindMany.mockResolvedValue(mockData);
    mockCount.mockResolvedValue(1);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/make-vs-buy");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("filters by status query param", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/make-vs-buy?status=ANALYSIS_DRAFT");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    await handler(req, { params: Promise.resolve({}) });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ANALYSIS_DRAFT" }),
      })
    );
  });

  it("supports search by part number/name", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/make-vs-buy?search=GPS");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    await handler(req, { params: Promise.resolve({}) });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          part: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ partNumber: expect.objectContaining({ contains: "GPS" }) }),
            ]),
          }),
        }),
      })
    );
  });
});

describe("POST /api/cost-optimization/make-vs-buy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates analysis with ROI and scoring", async () => {
    const createdAnalysis = {
      id: "new-1",
      partId: "p1",
      buyPrice: 280,
      makeCostEstimate: 85,
      recommendation: "STRONG_MAKE",
      part: { id: "p1", partNumber: "PRT-001", name: "Test Part", category: "COMPONENT" },
    };
    mockCreate.mockResolvedValue(createdAnalysis);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/make-vs-buy", "POST", {
      partId: "p1",
      buyPrice: 280,
      makeCostEstimate: 85,
      makeInvestmentRequired: 45000,
      annualVolumeEstimate: 500,
    });
    const handler = POST as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.id).toBe("new-1");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partId: "p1",
          buyPrice: 280,
          makeCostEstimate: 85,
          status: "ANALYSIS_DRAFT",
        }),
      })
    );
  });

  it("returns 400 when required fields are missing", async () => {
    const req = makeRequest("http://localhost:3000/api/cost-optimization/make-vs-buy", "POST", {
      partId: "p1",
      // missing buyPrice and makeCostEstimate
    });
    const handler = POST as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(400);
  });
});
