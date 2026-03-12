import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve({ user: { id: "user-1", name: "Test User", role: "admin" } })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkReadEndpointLimit: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: { logError: vi.fn() },
}));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    partAutonomyStatus: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    bomHeader: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { GET } from "@/app/api/cost-optimization/autonomy/route";

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/cost-optimization/autonomy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns autonomy summary with status counts", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "as1", partId: "p1", status: "MAKE", currentCost: 100, ndaaCompliant: true,
        part: { id: "p1", partNumber: "PRT-001", name: "Part A", category: "COMPONENT", makeOrBuy: "MAKE", unitCost: 100, ndaaCompliant: true },
      },
      {
        id: "as2", partId: "p2", status: "IN_DEVELOPMENT", currentCost: 200, ndaaCompliant: true,
        part: { id: "p2", partNumber: "PRT-002", name: "Part B", category: "COMPONENT", makeOrBuy: "MAKE", unitCost: 200, ndaaCompliant: true },
      },
      {
        id: "as3", partId: "p3", status: "BUY_STRATEGIC", currentCost: 300, ndaaCompliant: false,
        part: { id: "p3", partNumber: "PRT-003", name: "Part C", category: "COMPONENT", makeOrBuy: "BUY", unitCost: 300, ndaaCompliant: false },
      },
    ]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/autonomy");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary.totalParts).toBe(3);
    expect(json.summary.byStatus.MAKE).toBe(1);
    expect(json.summary.byStatus.IN_DEVELOPMENT).toBe(1);
    expect(json.summary.byStatus.BUY_STRATEGIC).toBe(1);
    // autonomy = (MAKE + IN_DEVELOPMENT) / total = 2/3 = 66.7%
    expect(json.summary.autonomyPercent).toBeCloseTo(66.7, 0);
    // cost autonomy = (100+200) / 600 = 50%
    expect(json.summary.costAutonomyPercent).toBe(50);
  });

  it("filters by productId using BOM parts", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "as1", partId: "p1", status: "MAKE", currentCost: 100, ndaaCompliant: true,
        part: { id: "p1", partNumber: "PRT-001", name: "Part A", category: "COMPONENT", makeOrBuy: "MAKE", unitCost: 100, ndaaCompliant: true },
      },
      {
        id: "as2", partId: "p2", status: "BUY_STRATEGIC", currentCost: 200, ndaaCompliant: true,
        part: { id: "p2", partNumber: "PRT-002", name: "Part B", category: "COMPONENT", makeOrBuy: "BUY", unitCost: 200, ndaaCompliant: true },
      },
    ]);
    mockFindFirst.mockResolvedValue({
      id: "bom1",
      bomLines: [{ partId: "p1" }], // only p1 in BOM
    });

    const req = makeRequest("http://localhost:3000/api/cost-optimization/autonomy?productId=prod-1");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(json.summary.totalParts).toBe(1);
    expect(json.parts).toHaveLength(1);
    expect(json.parts[0].partId).toBe("p1");
  });

  it("returns NDAA compliance percentage", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "as1", partId: "p1", status: "MAKE", currentCost: 100, ndaaCompliant: true,
        part: { id: "p1", partNumber: "PRT-001", name: "A", category: "COMPONENT", makeOrBuy: "MAKE", unitCost: 100, ndaaCompliant: true },
      },
      {
        id: "as2", partId: "p2", status: "BUY_STRATEGIC", currentCost: 100, ndaaCompliant: false,
        part: { id: "p2", partNumber: "PRT-002", name: "B", category: "COMPONENT", makeOrBuy: "BUY", unitCost: 100, ndaaCompliant: false },
      },
    ]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/autonomy");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    // 1/2 ndaa compliant = 50%
    expect(json.summary.ndaaCompliantPercent).toBe(50);
  });
});
