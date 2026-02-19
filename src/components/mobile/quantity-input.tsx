"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { haptic } from "@/lib/mobile/haptics";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  disabled = false,
  size = "md",
  className,
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleIncrement = () => {
    if (disabled) return;
    haptic("light");
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    if (disabled) return;
    haptic("light");
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setInputValue(value.toString());
      return;
    }
    const clampedValue = Math.max(min, Math.min(max, numValue));
    onChange(clampedValue);
    setInputValue(clampedValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  const sizeClasses = {
    sm: {
      button: "h-8 w-8",
      input: "h-8 text-sm w-16",
      icon: "h-4 w-4",
    },
    md: {
      button: "h-12 w-12",
      input: "h-12 text-lg w-20",
      icon: "h-5 w-5",
    },
    lg: {
      button: "h-14 w-14",
      input: "h-14 text-xl w-24",
      icon: "h-6 w-6",
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(sizes.button, "shrink-0")}
        aria-label="Giảm"
      >
        <Minus className={sizes.icon} />
      </Button>

      <Input
        type="number"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(sizes.input, "text-center font-bold")}
        min={min}
        max={max}
        step={step}
      />

      <Button
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(sizes.button, "shrink-0")}
        aria-label="Tăng"
      >
        <Plus className={sizes.icon} />
      </Button>
    </div>
  );
}
