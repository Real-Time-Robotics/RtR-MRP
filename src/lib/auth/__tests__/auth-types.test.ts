import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRoleLabel,
  getRoleColor,
  rolePermissions,
  mockUsers,
  type User,
  type Permission,
} from "../auth-types";

const adminUser = mockUsers.find((u) => u.role === "admin")!;
const managerUser = mockUsers.find((u) => u.role === "manager")!;
const operatorUser = mockUsers.find((u) => u.role === "operator")!;
const viewerUser = mockUsers.find((u) => u.role === "viewer")!;

describe("hasPermission", () => {
  it("returns false for null user", () => {
    expect(hasPermission(null, "dashboard:view")).toBe(false);
  });

  it("admin has all permissions", () => {
    expect(hasPermission(adminUser, "users:delete")).toBe(true);
    expect(hasPermission(adminUser, "settings:edit")).toBe(true);
    expect(hasPermission(adminUser, "orders:approve")).toBe(true);
  });

  it("viewer only has view permissions", () => {
    expect(hasPermission(viewerUser, "dashboard:view")).toBe(true);
    expect(hasPermission(viewerUser, "parts:view")).toBe(true);
    expect(hasPermission(viewerUser, "parts:create")).toBe(false);
    expect(hasPermission(viewerUser, "users:delete")).toBe(false);
  });

  it("operator has create but not approve permissions", () => {
    expect(hasPermission(operatorUser, "orders:create")).toBe(true);
    expect(hasPermission(operatorUser, "orders:approve")).toBe(false);
    expect(hasPermission(operatorUser, "users:create")).toBe(false);
  });

  it("manager has approve but not user management", () => {
    expect(hasPermission(managerUser, "orders:approve")).toBe(true);
    expect(hasPermission(managerUser, "purchasing:approve")).toBe(true);
    expect(hasPermission(managerUser, "users:create")).toBe(false);
    expect(hasPermission(managerUser, "settings:edit")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("returns false for null user", () => {
    expect(hasAnyPermission(null, ["dashboard:view"])).toBe(false);
  });

  it("returns true if user has at least one permission", () => {
    expect(
      hasAnyPermission(viewerUser, ["parts:create", "parts:view"])
    ).toBe(true);
  });

  it("returns false if user has none of the permissions", () => {
    expect(
      hasAnyPermission(viewerUser, ["parts:create", "parts:edit", "parts:delete"])
    ).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns false for null user", () => {
    expect(hasAllPermissions(null, ["dashboard:view"])).toBe(false);
  });

  it("returns true if user has all permissions", () => {
    expect(
      hasAllPermissions(adminUser, ["parts:view", "parts:create", "parts:edit"])
    ).toBe(true);
  });

  it("returns false if user is missing any permission", () => {
    expect(
      hasAllPermissions(viewerUser, ["parts:view", "parts:create"])
    ).toBe(false);
  });
});

describe("getRoleLabel", () => {
  it("returns Vietnamese labels for all roles", () => {
    expect(getRoleLabel("admin")).toBe("Quản trị viên");
    expect(getRoleLabel("manager")).toBe("Quản lý");
    expect(getRoleLabel("operator")).toBe("Nhân viên");
    expect(getRoleLabel("viewer")).toBe("Xem");
  });
});

describe("getRoleColor", () => {
  it("returns color classes for all roles", () => {
    expect(getRoleColor("admin")).toContain("red");
    expect(getRoleColor("manager")).toContain("blue");
    expect(getRoleColor("operator")).toContain("green");
    expect(getRoleColor("viewer")).toContain("gray");
  });
});

describe("rolePermissions", () => {
  it("admin has more permissions than manager", () => {
    expect(rolePermissions.admin.length).toBeGreaterThan(rolePermissions.manager.length);
  });

  it("manager has more permissions than operator", () => {
    expect(rolePermissions.manager.length).toBeGreaterThan(rolePermissions.operator.length);
  });

  it("operator has more permissions than viewer", () => {
    expect(rolePermissions.operator.length).toBeGreaterThan(rolePermissions.viewer.length);
  });

  it("all roles have dashboard:view", () => {
    for (const [, perms] of Object.entries(rolePermissions)) {
      expect(perms).toContain("dashboard:view");
    }
  });
});
