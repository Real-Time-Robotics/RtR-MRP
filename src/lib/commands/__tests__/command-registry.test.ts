import { describe, it, expect, vi } from "vitest";
import {
  createNavigationCommands,
  createActionCommands,
  createAICommand,
} from "../command-registry";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
} as unknown as Parameters<typeof createNavigationCommands>[0];

describe("createNavigationCommands", () => {
  it("returns 7 navigation commands", () => {
    const commands = createNavigationCommands(mockRouter);
    expect(commands).toHaveLength(7);
  });

  it("all commands have navigation group", () => {
    const commands = createNavigationCommands(mockRouter);
    for (const cmd of commands) {
      expect(cmd.group).toBe("navigation");
    }
  });

  it("all commands have unique ids", () => {
    const commands = createNavigationCommands(mockRouter);
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes dashboard, purchasing, sales, inventory, mrp, production, activity", () => {
    const commands = createNavigationCommands(mockRouter);
    const ids = commands.map((c) => c.id);
    expect(ids).toContain("nav-dashboard");
    expect(ids).toContain("nav-purchasing");
    expect(ids).toContain("nav-sales");
    expect(ids).toContain("nav-inventory");
    expect(ids).toContain("nav-mrp");
    expect(ids).toContain("nav-production");
    expect(ids).toContain("nav-activity");
  });

  it("all commands have keywords", () => {
    const commands = createNavigationCommands(mockRouter);
    for (const cmd of commands) {
      expect(cmd.keywords).toBeDefined();
      expect(cmd.keywords!.length).toBeGreaterThan(0);
    }
  });

  it("action calls router.push with correct path", () => {
    const commands = createNavigationCommands(mockRouter);
    const dashboard = commands.find((c) => c.id === "nav-dashboard")!;
    dashboard.action();
    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });
});

describe("createActionCommands", () => {
  it("returns 4 action commands", () => {
    const commands = createActionCommands(mockRouter);
    expect(commands).toHaveLength(4);
  });

  it("all commands have actions group", () => {
    const commands = createActionCommands(mockRouter);
    for (const cmd of commands) {
      expect(cmd.group).toBe("actions");
    }
  });

  it("includes run-mrp, new-po, new-so, low-stock", () => {
    const commands = createActionCommands(mockRouter);
    const ids = commands.map((c) => c.id);
    expect(ids).toContain("action-run-mrp");
    expect(ids).toContain("action-new-po");
    expect(ids).toContain("action-new-so");
    expect(ids).toContain("action-low-stock");
  });
});

describe("createAICommand", () => {
  it("returns a single command with ai group", () => {
    const callback = vi.fn();
    const cmd = createAICommand(callback);
    expect(cmd.id).toBe("ai-assistant");
    expect(cmd.group).toBe("ai");
    expect(cmd.shortcut).toBe("Cmd+J");
  });

  it("calls callback when action is invoked", () => {
    const callback = vi.fn();
    const cmd = createAICommand(callback);
    cmd.action();
    expect(callback).toHaveBeenCalled();
  });
});
