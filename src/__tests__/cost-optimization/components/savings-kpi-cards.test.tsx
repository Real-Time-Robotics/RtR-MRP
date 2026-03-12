import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SavingsKPICards } from "@/components/cost-optimization/dashboard/savings-kpi-cards";

const mockKPIs = {
  ytdSavings: 24900,
  completedActions: 4,
  inProgressActions: 3,
  pipelineSavings: 15000,
  activeTargets: 1,
};

describe("SavingsKPICards", () => {
  it("renders all 5 KPI cards", () => {
    render(<SavingsKPICards kpis={mockKPIs} />);

    expect(screen.getByText("YTD Savings")).toBeInTheDocument();
    expect(screen.getByText("Completed Actions")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Active Targets")).toBeInTheDocument();
  });

  it("displays completed actions count", () => {
    render(<SavingsKPICards kpis={mockKPIs} />);

    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("displays in-progress actions count", () => {
    render(<SavingsKPICards kpis={mockKPIs} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays active targets count", () => {
    render(<SavingsKPICards kpis={mockKPIs} />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders in a responsive grid layout", () => {
    const { container } = render(<SavingsKPICards kpis={mockKPIs} />);

    const grid = container.firstElementChild;
    expect(grid?.classList.contains("grid")).toBe(true);
    expect(grid?.classList.contains("grid-cols-2")).toBe(true);
    expect(grid?.classList.contains("lg:grid-cols-5")).toBe(true);
  });
});
