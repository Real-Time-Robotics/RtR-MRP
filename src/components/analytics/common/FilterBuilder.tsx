"use client";

import React, { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { QueryFilter } from "@/lib/analytics/types";

type FilterOperator = QueryFilter['operator'];

export interface FilterField {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "select" | "boolean";
  options?: { value: string; label: string }[];
}

export interface FilterBuilderProps {
  fields: FilterField[];
  filters: QueryFilter[];
  onChange: (filters: QueryFilter[]) => void;
  maxFilters?: number;
  className?: string;
}

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: "eq", label: "Bằng" },
    { value: "ne", label: "Khác" },
    { value: "contains", label: "Chứa" },
    { value: "in", label: "Trong danh sách" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "ne", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "between", label: "Trong khoảng" },
  ],
  date: [
    { value: "eq", label: "Bằng" },
    { value: "gt", label: "Sau" },
    { value: "gte", label: "Từ ngày" },
    { value: "lt", label: "Trước" },
    { value: "lte", label: "Đến ngày" },
    { value: "between", label: "Trong khoảng" },
  ],
  select: [
    { value: "eq", label: "Là" },
    { value: "ne", label: "Không phải" },
    { value: "in", label: "Trong" },
    { value: "notIn", label: "Ngoài" },
  ],
  boolean: [
    { value: "eq", label: "Là" },
  ],
};

export function FilterBuilder({
  fields,
  filters,
  onChange,
  maxFilters = 10,
  className,
}: FilterBuilderProps) {
  const addFilter = () => {
    if (filters.length >= maxFilters) return;

    const firstField = fields[0];
    onChange([
      ...filters,
      {
        field: firstField.key,
        operator: "eq" satisfies FilterOperator,
        value: "",
      },
    ]);
  };

  const updateFilter = (index: number, updates: Partial<QueryFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  const clearAllFilters = () => {
    onChange([]);
  };

  const getFieldConfig = (fieldKey: string) => {
    return fields.find((f) => f.key === fieldKey);
  };

  const getOperators = (fieldKey: string) => {
    const field = getFieldConfig(fieldKey);
    return OPERATORS[field?.type || "string"] || OPERATORS.string;
  };

  const renderValueInput = (filter: QueryFilter, index: number) => {
    const field = getFieldConfig(filter.field);

    if (!field) return null;

    // Select type
    if (field.type === "select" && field.options) {
      if (filter.operator === "in" || filter.operator === "notIn") {
        // Multi-select for "in" operators
        const values = Array.isArray(filter.value) ? filter.value : [];
        return (
          <div className="flex flex-wrap gap-1 flex-1 items-center min-w-[200px] border rounded-md p-1">
            {values.map((v: string, vIndex: number) => (
              <Badge key={vIndex} variant="secondary" className="gap-1">
                {field.options?.find((o) => o.value === v)?.label || v}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    const newValues = values.filter((_, i) => i !== vIndex);
                    updateFilter(index, { value: newValues });
                  }}
                />
              </Badge>
            ))}
            <Select
              onValueChange={(v) => {
                if (!values.includes(v)) {
                  updateFilter(index, { value: [...values, v] });
                }
              }}
            >
              <SelectTrigger className="w-auto border-0 h-6 px-1">
                <SelectValue placeholder="Thêm..." />
              </SelectTrigger>
              <SelectContent>
                {field.options
                  .filter((o) => !values.includes(o.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      return (
        <Select
          value={filter.value as string}
          onValueChange={(v) => updateFilter(index, { value: v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn giá trị" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Boolean type
    if (field.type === "boolean") {
      return (
        <Select
          value={String(filter.value)}
          onValueChange={(v) => updateFilter(index, { value: v === "true" })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Chọn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Có</SelectItem>
            <SelectItem value="false">Không</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Number type with between
    if (field.type === "number" && filter.operator === "between") {
      const values = Array.isArray(filter.value) ? filter.value : [0, 0];
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={values[0] || ""}
            onChange={(e) =>
              updateFilter(index, { value: [Number(e.target.value), values[1]] })
            }
            className="w-[100px]"
            placeholder="Từ"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            value={values[1] || ""}
            onChange={(e) =>
              updateFilter(index, { value: [values[0], Number(e.target.value)] })
            }
            className="w-[100px]"
            placeholder="Đến"
          />
        </div>
      );
    }

    // Date type
    if (field.type === "date") {
      if (filter.operator === "between") {
        const values = Array.isArray(filter.value) ? filter.value : ["", ""];
        return (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={values[0] || ""}
              onChange={(e) =>
                updateFilter(index, { value: [e.target.value, values[1]] })
              }
              className="w-[150px]"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={values[1] || ""}
              onChange={(e) =>
                updateFilter(index, { value: [values[0], e.target.value] })
              }
              className="w-[150px]"
            />
          </div>
        );
      }

      return (
        <Input
          type="date"
          value={filter.value as string}
          onChange={(e) => updateFilter(index, { value: e.target.value })}
          className="w-[150px]"
        />
      );
    }

    // Default: string/number input
    return (
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={filter.value as string}
        onChange={(e) =>
          updateFilter(index, {
            value: field.type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
        placeholder="Nhập giá trị"
        className="w-[200px]"
      />
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Bộ lọc</CardTitle>
          {filters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 text-xs"
            >
              Xóa tất cả
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {filters.map((filter, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            {/* Field selector */}
            <Select
              value={filter.field}
              onValueChange={(v) => {
                const newField = getFieldConfig(v);
                const newOperators = getOperators(v);
                updateFilter(index, {
                  field: v,
                  operator: newOperators[0].value as FilterOperator,
                  value: newField?.type === "boolean" ? false : "",
                });
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select
              value={filter.operator}
              onValueChange={(v) => updateFilter(index, { operator: v as FilterOperator })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getOperators(filter.field).map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            {renderValueInput(filter, index)}

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeFilter(index)}
              aria-label="Xóa bộ lọc"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={addFilter}
          disabled={filters.length >= maxFilters}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm bộ lọc
        </Button>
      </CardContent>
    </Card>
  );
}

export default FilterBuilder;
