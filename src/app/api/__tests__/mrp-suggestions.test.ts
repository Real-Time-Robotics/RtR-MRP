/**
 * MRP Suggestions API Route Tests
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../mrp/suggestions/[id]/route';
import { approveSuggestion, rejectSuggestion } from '@/lib/mrp-engine';
import { auth } from '@/lib/auth';

// Mock MRP engine functions
vi.mock('@/lib/mrp-engine', () => ({
  approveSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkReadEndpointLimit: vi.fn().mockResolvedValue(null),
  checkWriteEndpointLimit: vi.fn().mockResolvedValue(null),
  checkHeavyEndpointLimit: vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, retryAfter: 0 }),
}));

describe('MRP Suggestions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as Mock).mockResolvedValue({ user: { id: 'user-1' } });
  });

  describe('PATCH /api/mrp/suggestions/[id]', () => {
    it('should approve suggestion successfully', async () => {
      const mockResult = {
        success: true,
        suggestion: { id: 'sug-1', status: 'approved' },
      };

      (approveSuggestion as Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
          createPO: false,
          userId: 'user-1',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(approveSuggestion).toHaveBeenCalledWith('sug-1', 'user-1', false);
    });

    it('should approve suggestion and create PO when requested', async () => {
      const mockResult = {
        success: true,
        suggestion: { id: 'sug-1', status: 'approved' },
        purchaseOrder: { id: 'po-1', poNumber: 'PO-2025-0001' },
      };

      (approveSuggestion as Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
          createPO: true,
          userId: 'user-1',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.purchaseOrder).toBeDefined();
      expect(approveSuggestion).toHaveBeenCalledWith('sug-1', 'user-1', true);
    });

    it('should reject suggestion successfully', async () => {
      const mockResult = {
        success: true,
        suggestion: { id: 'sug-1', status: 'rejected' },
      };

      (rejectSuggestion as Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'reject',
          userId: 'user-1',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(rejectSuggestion).toHaveBeenCalledWith('sug-1', 'user-1');
    });

    it('should return 400 for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'invalid',
          userId: 'user-1',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dữ liệu không hợp lệ');
    });

    it('should return 500 when engine throws error', async () => {
      (approveSuggestion as Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
          userId: 'user-1',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update suggestion');
    });

    it('should use default userId when not provided', async () => {
      const mockResult = { success: true };
      (approveSuggestion as Mock).mockResolvedValue(mockResult);

      const request = new NextRequest('http://localhost:3000/api/mrp/suggestions/sug-1', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'approve',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'sug-1' }) });

      expect(response.status).toBe(200);
      expect(approveSuggestion).toHaveBeenCalledWith('sug-1', 'system', false);
    });
  });
});
