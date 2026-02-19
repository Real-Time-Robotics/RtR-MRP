"use client";

// src/components/excel/column-mapper.tsx
// Column Mapping Component for Excel Import

import { useState, useEffect } from "react";
import {
  ArrowRight,
  Check,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ColumnMapperProps {
  sourceColumns: string[];
  targetFields: FieldDefinition[];
  initialMappings?: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  sampleData?: Record<string, unknown>[];
}

export function ColumnMapper({
  sourceColumns,
  targetFields,
  initialMappings = [],
  onMappingChange,
  sampleData = [],
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Initialize mappings from props
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const mapping of initialMappings) {
      initial[mapping.sourceColumn] = mapping.targetField;
    }
    setMappings(initial);
  }, [initialMappings]);

  // Convert mappings to array format and notify parent
  useEffect(() => {
    const mappingArray: ColumnMapping[] = Object.entries(mappings)
      .filter(([, target]) => target !== "")
      .map(([source, target]) => ({
        sourceColumn: source,
        targetField: target,
      }));
    onMappingChange(mappingArray);
  }, [mappings, onMappingChange]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const autoMap = () => {
    const newMappings: Record<string, string> = {};

    for (const source of sourceColumns) {
      // Try exact match first
      const exactMatch = targetFields.find(
        (f) => f.key.toLowerCase() === source.toLowerCase()
      );
      if (exactMatch) {
        newMappings[source] = exactMatch.key;
        continue;
      }

      // Try label match
      const labelMatch = targetFields.find(
        (f) => f.label.toLowerCase() === source.toLowerCase()
      );
      if (labelMatch) {
        newMappings[source] = labelMatch.key;
        continue;
      }

      // Try partial match
      const normalizedSource = source.toLowerCase().replace(/[^a-z0-9]/g, "");
      const partialMatch = targetFields.find((f) => {
        const normalizedKey = f.key.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normalizedKey.includes(normalizedSource) ||
          normalizedSource.includes(normalizedKey) ||
          normalizedLabel.includes(normalizedSource) ||
          normalizedSource.includes(normalizedLabel)
        );
      });
      if (partialMatch) {
        newMappings[source] = partialMatch.key;
      }
    }

    setMappings(newMappings);
  };

  const clearMappings = () => {
    setMappings({});
  };

  const getMappedFields = (): Set<string> => {
    return new Set(Object.values(mappings).filter(Boolean));
  };

  const mappedFields = getMappedFields();

  const getRequiredMissing = (): FieldDefinition[] => {
    return targetFields.filter(
      (f) => f.required && !mappedFields.has(f.key)
    );
  };

  const requiredMissing = getRequiredMissing();

  const getSampleValue = (column: string): string => {
    if (!sampleData.length) return "";
    const value = sampleData[0][column];
    if (value === null || value === undefined) return "";
    const str = String(value);
    return str.length > 30 ? str.substring(0, 30) + "..." : str;
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={autoMap}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Auto-Map Columns
          </button>
          <button
            onClick={clearMappings}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {mappedFields.size} of {targetFields.length} fields mapped
        </div>
      </div>

      {/* Required fields warning */}
      {requiredMissing.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Required fields not mapped:</p>
            <p className="text-sm">
              {requiredMissing.map((f) => f.label).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source Column
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                &nbsp;
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sample Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sourceColumns.map((column) => {
              const targetField = mappings[column] || "";
              const isMapped = Boolean(targetField);

              return (
                <tr
                  key={column}
                  className={cn(
                    "transition-colors",
                    isMapped ? "bg-green-50" : "hover:bg-gray-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {column}
                      </span>
                      {isMapped && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 mx-auto" />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={targetField}
                      onChange={(e) =>
                        handleMappingChange(column, e.target.value)
                      }
                      aria-label={`Ánh xạ cột ${column}`}
                      className={cn(
                        "w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        isMapped
                          ? "border-green-300 bg-white"
                          : "border-gray-300"
                      )}
                    >
                      <option value="">-- Skip this column --</option>
                      {targetFields.map((field) => (
                        <option
                          key={field.key}
                          value={field.key}
                          disabled={
                            mappedFields.has(field.key) &&
                            mappings[column] !== field.key
                          }
                        >
                          {field.label}
                          {field.required ? " *" : ""}
                          {mappedFields.has(field.key) &&
                          mappings[column] !== field.key
                            ? " (already mapped)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {getSampleValue(column) || (
                        <span className="text-gray-400 italic">empty</span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unmapped target fields */}
      <div className="text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <HelpCircle className="w-4 h-4" />
          <span>
            Unmapped target fields will use default values or be left empty.
          </span>
        </div>
      </div>
    </div>
  );
}
