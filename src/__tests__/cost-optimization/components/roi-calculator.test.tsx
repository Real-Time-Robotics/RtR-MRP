import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ROICalculator } from "@/components/cost-optimization/make-vs-buy/roi-calculator";
import type { ROIResult } from "@/lib/cost-optimization/roi-calculations";

const mockROI: ROIResult = {
  savingsPerUnit: 195,
  savingsPercent: 69.64,
  annualSavings: 97500,
  breakEvenUnits: 231,
  breakEvenMonths: 6,
  paybackMonths: 6,
  npv1Year: 73636,
  npv3Year: 197500,
  npv5Year: 302500,
};

describe("ROICalculator", () => {
  it("renders all 4 KPI cards", () => {
    render(<ROICalculator roi={mockROI} />);

    expect(screen.getByText("Tiet kiem / don vi")).toBeInTheDocument();
    expect(screen.getByText("Tiet kiem hang nam")).toBeInTheDocument();
    expect(screen.getByText("Hoa von")).toBeInTheDocument();
    expect(screen.getByText("Hoan von")).toBeInTheDocument();
  });

  it("displays savings per unit with percentage", () => {
    render(<ROICalculator roi={mockROI} />);

    expect(screen.getByText("$195")).toBeInTheDocument();
    expect(screen.getByText("69.6%")).toBeInTheDocument();
  });

  it("displays break-even in months and units", () => {
    render(<ROICalculator roi={mockROI} />);

    const allMonthTexts = screen.getAllByText("6 thang");
    expect(allMonthTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("231 don vi")).toBeInTheDocument();
  });

  it("renders NPV table with 1/3/5 year values", () => {
    render(<ROICalculator roi={mockROI} />);

    expect(screen.getByText("Net Present Value (NPV)")).toBeInTheDocument();
    expect(screen.getByText("1 Nam")).toBeInTheDocument();
    expect(screen.getByText("3 Nam")).toBeInTheDocument();
    expect(screen.getByText("5 Nam")).toBeInTheDocument();
  });

  it("applies green color for positive savings", () => {
    const { container } = render(<ROICalculator roi={mockROI} />);

    const greenElements = container.querySelectorAll(".text-green-600");
    expect(greenElements.length).toBeGreaterThan(0);
  });

  it("applies red color for negative savings", () => {
    const negativeROI: ROIResult = {
      ...mockROI,
      savingsPerUnit: -40,
      annualSavings: -20000,
      npv1Year: -50000,
      npv3Year: -80000,
      npv5Year: -100000,
    };
    const { container } = render(<ROICalculator roi={negativeROI} />);

    const redElements = container.querySelectorAll(".text-red-600");
    expect(redElements.length).toBeGreaterThan(0);
  });
});
