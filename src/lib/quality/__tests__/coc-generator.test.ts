/**
 * CoC Generator Unit Tests
 * Tests for certificate number generation and PDF generation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { generateCertificateNumber, generateCoCPDF } from '../coc-generator';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    certificateOfConformance: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('CoC Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCertificateNumber', () => {
    it('should generate first certificate number of the year', async () => {
      const year = new Date().getFullYear();
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(0);

      const result = await generateCertificateNumber();

      expect(result).toBe(`COC-${year}-0001`);
      expect(prisma.certificateOfConformance.count).toHaveBeenCalledWith({
        where: {
          certificateNumber: {
            startsWith: `COC-${year}`,
          },
        },
      });
    });

    it('should generate sequential certificate number', async () => {
      const year = new Date().getFullYear();
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(42);

      const result = await generateCertificateNumber();

      expect(result).toBe(`COC-${year}-0043`);
    });

    it('should pad number to 4 digits', async () => {
      const year = new Date().getFullYear();
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(9);

      const result = await generateCertificateNumber();

      expect(result).toBe(`COC-${year}-0010`);
    });

    it('should handle numbers beyond 4 digits', async () => {
      const year = new Date().getFullYear();
      (prisma.certificateOfConformance.count as Mock).mockResolvedValue(9999);

      const result = await generateCertificateNumber();

      expect(result).toBe(`COC-${year}-10000`);
    });
  });

  describe('generateCoCPDF', () => {
    it('should throw error when certificate not found', async () => {
      (prisma.certificateOfConformance.findUnique as Mock).mockResolvedValue(null);

      await expect(generateCoCPDF('nonexistent-id')).rejects.toThrow('Certificate not found');
    });

    it('should query certificate with correct includes', async () => {
      (prisma.certificateOfConformance.findUnique as Mock).mockResolvedValue(null);

      try {
        await generateCoCPDF('coc-1');
      } catch {
        // Expected to throw
      }

      expect(prisma.certificateOfConformance.findUnique).toHaveBeenCalledWith({
        where: { id: 'coc-1' },
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
          product: true,
          inspection: true,
        },
      });
    });
  });
});
