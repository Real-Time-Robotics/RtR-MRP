import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoringDisplay } from "@/components/cost-optimization/make-vs-buy/scoring-display";

describe("ScoringDisplay", () => {
  const defaultProps = {
    financialScore: 8.5,
    capabilityScore: 7.2,
    strategicScore: 6.8,
    overallScore: 7.6,
    recommendation: "STRONG_MAKE",
    rationale: "High savings potential with existing capabilities",
    conditions: ["Requires equipment investment", "Need training"],
  };

  it("renders overall score", () => {
    render(<ScoringDisplay {...defaultProps} />);

    expect(screen.getByText("7.6")).toBeInTheDocument();
    expect(screen.getByText("Diem tong hop")).toBeInTheDocument();
  });

  it("renders all three sub-score bars", () => {
    render(<ScoringDisplay {...defaultProps} />);

    expect(screen.getByText("Tai chinh (40%)")).toBeInTheDocument();
    expect(screen.getByText("Nang luc (30%)")).toBeInTheDocument();
    expect(screen.getByText("Chien luoc (30%)")).toBeInTheDocument();

    expect(screen.getByText("8.5/10")).toBeInTheDocument();
    expect(screen.getByText("7.2/10")).toBeInTheDocument();
    expect(screen.getByText("6.8/10")).toBeInTheDocument();
  });

  it("displays STRONG_MAKE recommendation badge", () => {
    render(<ScoringDisplay {...defaultProps} />);

    expect(screen.getByText("Tu san xuat")).toBeInTheDocument();
  });

  it("displays STRONG_BUY recommendation badge", () => {
    render(<ScoringDisplay {...defaultProps} recommendation="STRONG_BUY" />);

    expect(screen.getByText("Mua ngoai")).toBeInTheDocument();
  });

  it("displays CONSIDER_MAKE recommendation badge", () => {
    render(<ScoringDisplay {...defaultProps} recommendation="CONSIDER_MAKE" />);

    expect(screen.getByText("Can nhac tu lam")).toBeInTheDocument();
  });

  it("renders rationale text", () => {
    render(<ScoringDisplay {...defaultProps} />);

    expect(screen.getByText("High savings potential with existing capabilities")).toBeInTheDocument();
  });

  it("renders conditions list", () => {
    render(<ScoringDisplay {...defaultProps} />);

    expect(screen.getByText("Dieu kien")).toBeInTheDocument();
    expect(screen.getByText("Requires equipment investment")).toBeInTheDocument();
    expect(screen.getByText("Need training")).toBeInTheDocument();
  });

  it("hides conditions section when empty", () => {
    render(<ScoringDisplay {...defaultProps} conditions={[]} />);

    expect(screen.queryByText("Dieu kien")).not.toBeInTheDocument();
  });
});
