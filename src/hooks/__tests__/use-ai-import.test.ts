import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAIImport } from '../use-ai-import';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// =============================================================================
// TESTS
// =============================================================================

describe('useAIImport', () => {
  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAIImport());

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isDetectingEntity).toBe(false);
      expect(result.current.isMappingColumns).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isCheckingDuplicates).toBe(false);
      expect(result.current.entitySuggestion).toBeNull();
      expect(result.current.columnSuggestions).toEqual([]);
      expect(result.current.dataIssues).toEqual([]);
      expect(result.current.duplicates).toEqual([]);
      expect(result.current.duplicateResolutions).toEqual([]);
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('analyzeFile', () => {
    it('should detect entity type from headers and sample data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          entityDetection: {
            entity: 'parts',
            confidence: 0.95,
            reason: 'Headers match parts schema',
          },
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(
          ['Part Number', 'Name', 'Category'],
          [{ 'Part Number': 'PN-001', Name: 'Bolt', Category: 'Fasteners' }]
        );
      });

      expect(result.current.entitySuggestion).toEqual({
        entity: 'parts',
        confidence: 0.95,
        reason: 'Headers match parts schema',
      });
      expect(result.current.isDetectingEntity).toBe(false);
      expect(result.current.error).toBeNull();

      expect(mockFetch).toHaveBeenCalledWith('/api/excel/import/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: ['Part Number', 'Name', 'Category'],
          sampleData: [{ 'Part Number': 'PN-001', Name: 'Bolt', Category: 'Fasteners' }],
          options: { useAI: true },
        }),
      });
    });

    it('should handle analysis error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Analysis failed' }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(['Col1'], [{ Col1: 'val' }]);
      });

      expect(result.current.error).toBe('Analysis failed');
      expect(result.current.isDetectingEntity).toBe(false);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(['Col1'], []);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should respect useAI option', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ entityDetection: null }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(['Col1'], [], { useAI: false });
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.options.useAI).toBe(false);
    });
  });

  describe('suggestMappings', () => {
    it('should return column mapping suggestions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          columnMapping: {
            aiSuggestions: [
              {
                sourceColumn: 'Part Number',
                suggestedField: 'partNumber',
                confidence: 0.98,
                reason: 'Exact match',
              },
              {
                sourceColumn: 'Name',
                suggestedField: 'name',
                confidence: 0.95,
                reason: 'Direct mapping',
              },
            ],
          },
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.suggestMappings(
          ['Part Number', 'Name'],
          'parts',
          [{ 'Part Number': 'PN-001', Name: 'Bolt' }]
        );
      });

      expect(result.current.columnSuggestions).toHaveLength(2);
      expect(result.current.columnSuggestions[0].sourceColumn).toBe('Part Number');
      expect(result.current.columnSuggestions[0].suggestedField).toBe('partNumber');
      expect(result.current.isMappingColumns).toBe(false);
    });

    it('should use aiColumnSuggestions fallback', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          aiColumnSuggestions: [
            {
              sourceColumn: 'Supplier Code',
              suggestedField: 'code',
              confidence: 0.9,
            },
          ],
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.suggestMappings(
          ['Supplier Code'],
          'suppliers',
          [{ 'Supplier Code': 'SUP-001' }]
        );
      });

      expect(result.current.columnSuggestions).toHaveLength(1);
    });

    it('should handle mapping error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Mapping failed' }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.suggestMappings(['Col'], 'parts', []);
      });

      expect(result.current.error).toBe('Mapping failed');
    });

    it('should send confidence threshold in options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ columnMapping: { aiSuggestions: [] } }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.suggestMappings(
          ['Col'],
          'parts',
          [],
          { confidenceThreshold: 0.9 }
        );
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.options.confidenceThreshold).toBe(0.9);
    });
  });

  describe('validateImportData', () => {
    it('should validate data and return issues', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          dataValidation: {
            issues: [
              { row: 3, column: 'partNumber', severity: 'error', message: 'Required field missing' },
              { row: 5, column: 'price', severity: 'warning', message: 'Unusual value' },
            ],
            summary: {
              totalIssues: 2,
              errors: 1,
              warnings: 1,
            },
          },
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.validateImportData(
          [{ partNumber: 'PN-001' }, { partNumber: '' }],
          'parts',
          [{ sourceColumn: 'partNumber', targetField: 'partNumber' }]
        );
      });

      expect(result.current.dataIssues).toHaveLength(2);
      expect(result.current.summary?.totalIssues).toBe(2);
      expect(result.current.summary?.errors).toBe(1);
      expect(result.current.summary?.warnings).toBe(1);
      expect(result.current.isValidating).toBe(false);
    });

    it('should handle validation error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Validation failed' }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.validateImportData([], 'parts', []);
      });

      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('checkForDuplicates', () => {
    it('should check for duplicates and return results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          duplicateCheck: {
            duplicates: [
              { row: 2, existingId: 'part-1', similarity: 1.0 },
            ],
            summary: {
              exactDuplicates: 1,
              newRecords: 4,
            },
          },
          duplicateResolutions: [
            { row: 2, action: 'skip', reason: 'Exact duplicate' },
          ],
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.checkForDuplicates(
          [{ partNumber: 'PN-001' }],
          'parts',
          'partNumber'
        );
      });

      expect(result.current.duplicates).toHaveLength(1);
      expect(result.current.duplicateResolutions).toHaveLength(1);
      expect(result.current.summary?.duplicatesFound).toBe(1);
      expect(result.current.summary?.newRecords).toBe(4);
      expect(result.current.isCheckingDuplicates).toBe(false);
    });

    it('should handle duplicate check error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Duplicate check failed' }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.checkForDuplicates([], 'parts');
      });

      expect(result.current.error).toBe('Duplicate check failed');
    });
  });

  describe('runFullAnalysis', () => {
    it('should run complete analysis pipeline', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          entityDetection: { entity: 'parts', confidence: 0.95 },
          columnMapping: {
            aiSuggestions: [
              { sourceColumn: 'Name', suggestedField: 'name', confidence: 0.9 },
            ],
          },
          dataValidation: {
            issues: [],
            summary: { totalIssues: 0, errors: 0, warnings: 0 },
          },
          duplicateCheck: {
            duplicates: [],
            summary: { exactDuplicates: 0, newRecords: 5 },
          },
          duplicateResolutions: [],
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.runFullAnalysis(
          ['Name', 'Category'],
          [
            { Name: 'Bolt', Category: 'Fasteners' },
            { Name: 'Nut', Category: 'Fasteners' },
          ],
          'parts'
        );
      });

      // @ts-expect-error test data
      expect(result.current.entitySuggestion?.entity).toBe('parts');
      expect(result.current.columnSuggestions).toHaveLength(1);
      expect(result.current.dataIssues).toEqual([]);
      expect(result.current.duplicates).toEqual([]);
      expect(result.current.summary?.newRecords).toBe(5);
      expect(result.current.isAnalyzing).toBe(false);
    });

    it('should handle full analysis error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Analysis failed' }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.runFullAnalysis(['Col'], []);
      });

      expect(result.current.error).toBe('Analysis failed');
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  describe('applyColumnSuggestion', () => {
    it('should return a ColumnMapping for high-confidence suggestions', () => {
      const { result } = renderHook(() => useAIImport());

      const mapping = result.current.applyColumnSuggestion({
        sourceColumn: 'Part Number',
        suggestedField: 'partNumber',
        confidence: 0.9,
        reason: 'Match',
      } as never);

      expect(mapping).toEqual({
        sourceColumn: 'Part Number',
        targetField: 'partNumber',
      });
    });

    it('should return null for low-confidence suggestions', () => {
      const { result } = renderHook(() => useAIImport());

      const mapping = result.current.applyColumnSuggestion({
        sourceColumn: 'Unknown',
        suggestedField: 'name',
        confidence: 0.3,
        reason: 'Guess',
      } as never);

      expect(mapping).toBeNull();
    });

    it('should return null when suggestedField is empty', () => {
      const { result } = renderHook(() => useAIImport());

      const mapping = result.current.applyColumnSuggestion({
        sourceColumn: 'Col',
        suggestedField: '',
        confidence: 0.9,
        reason: 'No match',
      } as never);

      expect(mapping).toBeNull();
    });
  });

  describe('clearResults', () => {
    it('should clear all results but keep loading states', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          entityDetection: { entity: 'parts', confidence: 0.9 },
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(['Col'], []);
      });

      expect(result.current.entitySuggestion).toBeDefined();

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.entitySuggestion).toBeNull();
      expect(result.current.columnSuggestions).toEqual([]);
      expect(result.current.dataIssues).toEqual([]);
      expect(result.current.duplicates).toEqual([]);
      expect(result.current.summary).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          entityDetection: { entity: 'parts', confidence: 0.9 },
        }),
      });

      const { result } = renderHook(() => useAIImport());

      await act(async () => {
        await result.current.analyzeFile(['Col'], []);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.isDetectingEntity).toBe(false);
      expect(result.current.isMappingColumns).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.isCheckingDuplicates).toBe(false);
      expect(result.current.entitySuggestion).toBeNull();
      expect(result.current.columnSuggestions).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});
