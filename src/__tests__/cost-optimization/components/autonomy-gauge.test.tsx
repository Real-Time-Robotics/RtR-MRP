import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutonomyGauge } from "@/components/cost-optimization/autonomy/autonomy-gauge";

describe("AutonomyGauge", () => {
  it("renders percentage and label", () => {
    render(<AutonomyGauge percent={75.5} label="Autonomy Rate" />);

    expect(screen.getByText("75.5%")).toBeInTheDocument();
    expect(screen.getByText("Autonomy Rate")).toBeInTheDocument();
  });

  it("renders SVG circles", () => {
    const { container } = render(<AutonomyGauge percent={50} label="Test" />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2); // background + progress
  });

  it("applies green color for >= 80%", () => {
    const { container } = render(<AutonomyGauge percent={85} label="High" />);

    const progressCircle = container.querySelectorAll("circle")[1];
    expect(progressCircle.classList.contains("stroke-green-500")).toBe(true);
  });

  it("applies yellow color for >= 50% and < 80%", () => {
    const { container } = render(<AutonomyGauge percent={65} label="Mid" />);

    const progressCircle = container.querySelectorAll("circle")[1];
    expect(progressCircle.classList.contains("stroke-yellow-500")).toBe(true);
  });

  it("applies red color for < 50%", () => {
    const { container } = render(<AutonomyGauge percent={30} label="Low" />);

    const progressCircle = container.querySelectorAll("circle")[1];
    expect(progressCircle.classList.contains("stroke-red-500")).toBe(true);
  });

  it("clamps percent to 0-100 range", () => {
    render(<AutonomyGauge percent={150} label="Over" />);
    expect(screen.getByText("100.0%")).toBeInTheDocument();

    render(<AutonomyGauge percent={-10} label="Under" />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("supports different sizes", () => {
    const { container: sm } = render(<AutonomyGauge percent={50} label="SM" size="sm" />);
    const { container: lg } = render(<AutonomyGauge percent={50} label="LG" size="lg" />);

    const smSvg = sm.querySelector("svg");
    const lgSvg = lg.querySelector("svg");
    const smWidth = parseInt(smSvg?.getAttribute("width") || "0");
    const lgWidth = parseInt(lgSvg?.getAttribute("width") || "0");
    expect(lgWidth).toBeGreaterThan(smWidth);
  });
});
