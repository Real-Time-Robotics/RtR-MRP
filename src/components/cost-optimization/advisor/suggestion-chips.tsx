"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  compact?: boolean;
}

export function SuggestionChips({
  suggestions,
  onSelect,
  compact,
}: SuggestionChipsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        compact ? "justify-start" : "justify-center"
      )}
    >
      {suggestions.map((suggestion, i) => (
        <Button
          key={i}
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "text-left whitespace-normal h-auto py-2",
            compact && "text-xs"
          )}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
