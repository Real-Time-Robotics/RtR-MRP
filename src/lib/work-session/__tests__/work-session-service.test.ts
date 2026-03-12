import { describe, it, expect, vi } from "vitest";

// We test the pure helper functions by importing the module
// parseContext and serializeSession are not exported, but we can test them indirectly
// via the exported functions that use them

// Mock prisma
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workSession: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    sessionActivity: {
      create: vi.fn().mockResolvedValue({
        id: "act-1",
        sessionId: "s1",
        action: "CREATE",
        description: "Test",
        timestamp: new Date("2026-01-01"),
        metadataJson: null,
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  startSession,
  pauseSession,
  completeSession,
  getUserSessions,
} from "../work-session-service";

const baseSession = {
  id: "s1",
  userId: "u1",
  entityType: "PURCHASE_ORDER" as any,
  entityId: "po-1",
  entityNumber: "PO-001",
  status: "ACTIVE",
  workflowStep: 1,
  workflowTotalSteps: 5,
  workflowStepName: "Draft",
  contextSummary: "",
  contextJson: { summary: "test", completedActions: [], pendingActions: [], keyMetrics: {} },
  startedAt: new Date("2026-01-01T10:00:00Z"),
  lastActivityAt: new Date("2026-01-01T10:30:00Z"),
  pausedAt: null,
  completedAt: null,
  totalActiveTime: 0,
  resumeUrl: "/purchasing/po-1",
};

describe("startSession", () => {
  it("resumes existing session if found", async () => {
    mockFindFirst.mockResolvedValue(baseSession);
    mockUpdate.mockResolvedValue({ ...baseSession, status: "ACTIVE" });

    const result = await startSession("u1", {
      entityType: "PURCHASE_ORDER" as any,
      entityId: "po-1",
      entityNumber: "PO-001",
      resumeUrl: "/purchasing/po-1",
    });

    expect(result.id).toBe("s1");
    expect(result.status).toBe("ACTIVE");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("creates new session if none exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(baseSession);

    const result = await startSession("u1", {
      entityType: "PURCHASE_ORDER" as any,
      entityId: "po-1",
      entityNumber: "PO-001",
      resumeUrl: "/purchasing/po-1",
    });

    expect(result.id).toBe("s1");
    expect(mockCreate).toHaveBeenCalled();
  });

  it("serializes dates to ISO strings", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(baseSession);

    const result = await startSession("u1", {
      entityType: "PURCHASE_ORDER" as any,
      entityId: "po-1",
      entityNumber: "PO-001",
      resumeUrl: "/purchasing/po-1",
    });

    expect(result.startedAt).toBe("2026-01-01T10:00:00.000Z");
    expect(result.lastActivityAt).toBe("2026-01-01T10:30:00.000Z");
    expect(result.pausedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it("parses context from JSON", async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      ...baseSession,
      contextJson: {
        summary: "Working on PO",
        completedActions: ["step1"],
        pendingActions: ["step2"],
        keyMetrics: { total: 5000 },
      },
    });

    const result = await startSession("u1", {
      entityType: "PURCHASE_ORDER" as any,
      entityId: "po-1",
      entityNumber: "PO-001",
      resumeUrl: "/purchasing/po-1",
    });

    expect(result.context.summary).toBe("Working on PO");
    expect(result.context.completedActions).toEqual(["step1"]);
    expect(result.context.keyMetrics).toEqual({ total: 5000 });
  });
});

describe("pauseSession", () => {
  it("returns null if session not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await pauseSession("s999", "u1");

    expect(result).toBeNull();
  });

  it("pauses and updates active time", async () => {
    mockFindFirst.mockResolvedValue(baseSession);
    mockUpdate.mockResolvedValue({
      ...baseSession,
      status: "PAUSED",
      pausedAt: new Date("2026-01-01T11:00:00Z"),
    });

    const result = await pauseSession("s1", "u1");

    expect(result!.status).toBe("PAUSED");
    expect(result!.pausedAt).toBeTruthy();
  });
});

describe("completeSession", () => {
  it("returns null if session not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await completeSession("s999", "u1");

    expect(result).toBeNull();
  });

  it("marks session as completed", async () => {
    mockFindFirst.mockResolvedValue(baseSession);
    mockUpdate.mockResolvedValue({
      ...baseSession,
      status: "COMPLETED",
      completedAt: new Date("2026-01-01T12:00:00Z"),
    });

    const result = await completeSession("s1", "u1");

    expect(result!.status).toBe("COMPLETED");
    expect(result!.completedAt).toBeTruthy();
  });
});

describe("getUserSessions", () => {
  it("returns serialized sessions", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindMany.mockResolvedValue([baseSession]);

    const results = await getUserSessions("u1");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("s1");
    expect(typeof results[0].startedAt).toBe("string");
  });

  it("returns empty array when no sessions", async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindMany.mockResolvedValue([]);

    const results = await getUserSessions("u1");

    expect(results).toHaveLength(0);
  });
});
