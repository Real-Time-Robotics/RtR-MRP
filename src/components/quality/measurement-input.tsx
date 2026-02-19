"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Check, AlertTriangle } from "lucide-react";

interface MeasurementInputProps {
  specification: {
    nominal: number;
    upperLimit: number;
    lowerLimit: number;
    unit: string;
  };
  sampleSize: number;
  onComplete: (values: number[], result: "PASS" | "FAIL") => void;
}

export function MeasurementInput({
  specification,
  sampleSize,
  onComplete,
}: MeasurementInputProps) {
  const [values, setValues] = useState<number[]>([]);
  const [currentValue, setCurrentValue] = useState("");

  const addMeasurement = () => {
    const num = parseFloat(currentValue);
    if (!isNaN(num)) {
      const newValues = [...values, num];
      setValues(newValues);
      setCurrentValue("");

      if (newValues.length >= sampleSize) {
        const allPass = newValues.every(
          (v) => v >= specification.lowerLimit && v <= specification.upperLimit
        );
        onComplete(newValues, allPass ? "PASS" : "FAIL");
      }
    }
  };

  const removeMeasurement = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const isWithinSpec = (value: number) =>
    value >= specification.lowerLimit && value <= specification.upperLimit;

  const stats =
    values.length > 0
      ? {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        }
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Spec: {specification.nominal} ±
          {(specification.upperLimit - specification.nominal).toFixed(3)}{" "}
          {specification.unit}
        </span>
        <span>•</span>
        <span>
          Range: {specification.lowerLimit} - {specification.upperLimit}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.001"
          placeholder={`Enter measurement (${specification.unit})`}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMeasurement()}
          className="w-40"
        />
        <Button size="sm" onClick={addMeasurement}>
          <Plus className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {values.length} / {sampleSize}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {values.map((value, index) => (
          <div
            key={index}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm ${
              isWithinSpec(value)
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isWithinSpec(value) ? (
              <Check className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3" />
            )}
            {value.toFixed(3)}
            <button
              onClick={() => removeMeasurement(index)}
              className="ml-1 hover:text-red-600"
              aria-label="Xóa"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {stats && (
        <div className="flex gap-4 text-sm">
          <span>
            Min: <strong>{stats.min.toFixed(3)}</strong>
          </span>
          <span>
            Max: <strong>{stats.max.toFixed(3)}</strong>
          </span>
          <span>
            Avg: <strong>{stats.avg.toFixed(3)}</strong>
          </span>
          <span
            className={
              stats.min >= specification.lowerLimit &&
              stats.max <= specification.upperLimit
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {stats.min >= specification.lowerLimit &&
            stats.max <= specification.upperLimit
              ? "✓ Within Spec"
              : "✗ Out of Spec"}
          </span>
        </div>
      )}
    </div>
  );
}
