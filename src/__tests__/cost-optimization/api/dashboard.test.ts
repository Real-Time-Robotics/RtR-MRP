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

const mockSavingsFindMany = vi.fn();
const mockActionsFindMany = vi.fn();
const mockTargetsFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: {
    savingsRecord: {
      findMany: (...args: unknown[]) => mockSavingsFindMany(...args),
    },
    costReductionAction: {
      findMany: (...args: unknown[]) => mockActionsFindMany(...args),
    },
    costTarget: {
      findMany: (...args: unknown[]) => mockTargetsFindMany(...args),
    },
  },
}));

import { GET } from "@/app/api/cost-optimization/dashboard/route";

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/cost-optimization/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns KPIs with correct totals", async () => {
    mockSavingsFindMany.mockResolvedValue([
      {
        source: "MAKE_VS_BUY",
        totalSavings: 15000,
        periodStart: new Date(2026, 0, 1),
        periodEnd: new Date(2026, 0, 31),
        action: { part: { partNumber: "PRT-001", name: "A" }, owner: { name: "User" } },
      },
      {
        source: "SUBSTITUTE",
        totalSavings: 10000,
        periodStart: new Date(2026, 1, 1),
        periodEnd: new Date(2026, 1, 28),
        action: { part: { partNumber: "PRT-002", name: "B" }, owner: { name: "User" } },
      },
    ]);

    // First call = completedActions, second call = inProgressActions
    mockActionsFindMany
      .mockResolvedValueOnce([
        { id: "a1", description: "Action 1", type: "MAKE", annualSavings: 15000, status: "COMPLETED_ACTION", part: { partNumber: "PRT-001" }, owner: { name: "User" } },
      ])
      .mockResolvedValueOnce([
        { id: "a2", description: "Action 2", type: "SUBSTITUTE", annualSavings: 20000, progressPercent: 50, part: { partNumber: "PRT-002" } },
      ]);

    mockTargetsFindMany.mockResolvedValue([
      { id: "t1", name: "Target 1", currentCost: 1250, targetCost: 625 },
    ]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/dashboard?year=2026");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.kpis.ytdSavings).toBe(25000);
    expect(json.kpis.completedActions).toBe(1);
    expect(json.kpis.inProgressActions).toBe(1);
    expect(json.kpis.pipelineSavings).toBe(10000); // 20000 * 50%
    expect(json.kpis.activeTargets).toBe(1);
  });

  it("returns savings breakdown by source", async () => {
    mockSavingsFindMany.mockResolvedValue([
      { source: "MAKE_VS_BUY", totalSavings: 6000, periodStart: new Date(2026, 0, 1), periodEnd: new Date(2026, 0, 31), action: { part: null, owner: { name: "User" } } },
      { source: "MAKE_VS_BUY", totalSavings: 4000, periodStart: new Date(2026, 1, 1), periodEnd: new Date(2026, 1, 28), action: { part: null, owner: { name: "User" } } },
      { source: "SUBSTITUTE", totalSavings: 10000, periodStart: new Date(2026, 2, 1), periodEnd: new Date(2026, 2, 31), action: { part: null, owner: { name: "User" } } },
    ]);
    mockActionsFindMany.mockResolvedValue([]);
    mockTargetsFindMany.mockResolvedValue([]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/dashboard?year=2026");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(json.savingsBySource).toHaveLength(2);
    const makeVsBuy = json.savingsBySource.find((s: { source: string }) => s.source === "MAKE_VS_BUY");
    expect(makeVsBuy.amount).toBe(10000);
    expect(makeVsBuy.percent).toBe(50); // 10k/20k = 50%
  });

  it("returns monthly trend data with 12 months", async () => {
    mockSavingsFindMany.mockResolvedValue([]);
    mockActionsFindMany.mockResolvedValue([]);
    mockTargetsFindMany.mockResolvedValue([]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/dashboard?year=2026");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(json.monthlyTrend).toHaveLength(12);
    expect(json.monthlyTrend[0].month).toBe("Jan");
  });

  it("returns actual vs plan data", async () => {
    mockSavingsFindMany.mockResolvedValue([]);
    mockActionsFindMany.mockResolvedValue([]);
    mockTargetsFindMany.mockResolvedValue([
      { id: "t1", name: "Target", currentCost: 1200, targetCost: 600 },
    ]);

    const req = makeRequest("http://localhost:3000/api/cost-optimization/dashboard?year=2026");
    const handler = GET as (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
    const res = await handler(req, { params: Promise.resolve({}) });
    const json = await res.json();

    expect(json.actualVsPlan.data).toHaveLength(12);
    expect(json.actualVsPlan.totalPlan).toBe(600); // (1200-600)
    expect(json.actualVsPlan.data[0].plan).toBe(50); // 600/12
  });
});
