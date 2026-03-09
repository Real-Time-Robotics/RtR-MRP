import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDataExport } from '../use-data-export';

vi.mock('@/lib/client-logger', () => ({
  clientLogger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Mock xlsx module
const mockWriteFile = vi.fn();
const mockBookNew = vi.fn().mockReturnValue({});
const mockJsonToSheet = vi.fn().mockReturnValue({});
const mockBookAppendSheet = vi.fn();

vi.mock('xlsx', () => ({
  utils: {
    book_new: () => mockBookNew(),
    json_to_sheet: (data: unknown) => mockJsonToSheet(data),
    book_append_sheet: (...args: unknown[]) => mockBookAppendSheet(...args),
  },
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
}));

describe('useDataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return exportToExcel function', () => {
    const { result } = renderHook(() => useDataExport());
    expect(typeof result.current.exportToExcel).toBe('function');
  });

  it('should not export with empty data', async () => {
    const { result } = renderHook(() => useDataExport());

    await act(async () => {
      await result.current.exportToExcel([]);
    });

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('should export data to Excel', async () => {
    const { result } = renderHook(() => useDataExport());
    const data = [{ name: 'Item 1', qty: 10 }, { name: 'Item 2', qty: 20 }];

    await act(async () => {
      await result.current.exportToExcel(data);
    });

    expect(mockJsonToSheet).toHaveBeenCalledWith(data);
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('should use custom file name', async () => {
    const { result } = renderHook(() => useDataExport());
    const data = [{ name: 'Item 1' }];

    await act(async () => {
      await result.current.exportToExcel(data, { fileName: 'inventory-report' });
    });

    const fileName = mockWriteFile.mock.calls[0][1];
    expect(fileName).toContain('inventory-report');
    expect(fileName).toContain('.xlsx');
  });

  it('should use custom sheet name', async () => {
    const { result } = renderHook(() => useDataExport());
    const data = [{ name: 'Item 1' }];

    await act(async () => {
      await result.current.exportToExcel(data, { sheetName: 'Parts' });
    });

    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'Parts'
    );
  });
});
