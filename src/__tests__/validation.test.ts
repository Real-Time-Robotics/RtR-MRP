import { describe, it, expect } from 'vitest'
import {
  PaginationSchema,
  SortSchema,
  SearchSchema,
  IdSchema,
  DateRangeSchema,
  PartQuerySchema,
  PartCreateSchema,
} from '@/lib/validation/schemas'

describe('Validation Schemas', () => {
  describe('PaginationSchema', () => {
    it('should accept valid pagination', () => {
      const result = PaginationSchema.safeParse({ page: 1, pageSize: 20 })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(20)
      }
    })

    it('should use defaults when not provided', () => {
      const result = PaginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(20)
      }
    })

    it('should reject negative page', () => {
      const result = PaginationSchema.safeParse({ page: -1 })
      expect(result.success).toBe(false)
    })

    it('should reject pageSize over 100', () => {
      const result = PaginationSchema.safeParse({ pageSize: 101 })
      expect(result.success).toBe(false)
    })

    it('should coerce string numbers', () => {
      const result = PaginationSchema.safeParse({ page: '5', pageSize: '50' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(5)
        expect(result.data.pageSize).toBe(50)
      }
    })
  })

  describe('SortSchema', () => {
    it('should accept valid sort options', () => {
      const result = SortSchema.safeParse({ sortBy: 'name', sortOrder: 'desc' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sortBy).toBe('name')
        expect(result.data.sortOrder).toBe('desc')
      }
    })

    it('should default sortOrder to asc', () => {
      const result = SortSchema.safeParse({ sortBy: 'name' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sortOrder).toBe('asc')
      }
    })

    it('should reject invalid sortOrder', () => {
      const result = SortSchema.safeParse({ sortOrder: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('SearchSchema', () => {
    it('should accept valid search', () => {
      const result = SearchSchema.safeParse({ search: 'test query' })
      expect(result.success).toBe(true)
    })

    it('should reject search over 200 chars', () => {
      const result = SearchSchema.safeParse({ search: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('IdSchema', () => {
    it('should accept valid ID', () => {
      const result = IdSchema.safeParse({ id: 'abc123' })
      expect(result.success).toBe(true)
    })

    it('should reject empty ID', () => {
      const result = IdSchema.safeParse({ id: '' })
      expect(result.success).toBe(false)
    })

    it('should reject ID over 50 chars', () => {
      const result = IdSchema.safeParse({ id: 'a'.repeat(51) })
      expect(result.success).toBe(false)
    })
  })

  describe('DateRangeSchema', () => {
    it('should accept valid date range', () => {
      const result = DateRangeSchema.safeParse({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('should reject when startDate is after endDate', () => {
      const result = DateRangeSchema.safeParse({
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      })
      expect(result.success).toBe(false)
    })

    it('should allow omitting both dates', () => {
      const result = DateRangeSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('PartQuerySchema', () => {
    it('should accept valid query with all filters', () => {
      const result = PartQuerySchema.safeParse({
        page: 1,
        pageSize: 20,
        search: 'motor',
        category: 'Electronics',
        status: 'ACTIVE',
        type: 'BUY',
        sortBy: 'partNumber',
        sortOrder: 'asc'
      })
      expect(result.success).toBe(true)
    })

    it('should accept minimal query', () => {
      const result = PartQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = PartQuerySchema.safeParse({ status: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid stockStatus', () => {
      const result = PartQuerySchema.safeParse({ stockStatus: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('PartCreateSchema', () => {
    const validPart = {
      partNumber: 'PART-001',
      name: 'Test Part',
      category: 'Electronics',
      unitCost: 10.50
    }

    it('should accept valid part data', () => {
      const result = PartCreateSchema.safeParse(validPart)
      expect(result.success).toBe(true)
    })

    it('should reject missing required fields', () => {
      const result = PartCreateSchema.safeParse({ name: 'Test' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid partNumber format', () => {
      const result = PartCreateSchema.safeParse({
        ...validPart,
        partNumber: 'invalid part number!'
      })
      expect(result.success).toBe(false)
    })

    it('should apply default values', () => {
      const result = PartCreateSchema.safeParse(validPart)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.unit).toBe('pcs')
        expect(result.data.ndaaCompliant).toBe(true)
        expect(result.data.itarControlled).toBe(false)
        expect(result.data.minStock).toBe(0)
        expect(result.data.makeOrBuy).toBe('BUY')
      }
    })

    it('should accept full part data', () => {
      const fullPart = {
        ...validPart,
        description: 'A test part for unit testing',
        subCategory: 'Motors',
        partType: 'Component',
        unit: 'pcs',
        ndaaCompliant: true,
        itarControlled: true,
        rohsCompliant: true,
        countryOfOrigin: 'US',
        hsCode: '8501.10',
        lotControl: true,
        serialControl: false,
        minStock: 10,
        maxStock: 100,
        reorderPoint: 20,
        safetyStock: 5,
        leadTimeDays: 7,
        critical: true,
        standardCost: 12.00,
        makeOrBuy: 'BUY',
        manufacturer: 'Acme Corp',
        manufacturerPn: 'ACM-001'
      }
      const result = PartCreateSchema.safeParse(fullPart)
      expect(result.success).toBe(true)
    })

    it('should reject negative unitCost', () => {
      const result = PartCreateSchema.safeParse({
        ...validPart,
        unitCost: -10
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative minStock', () => {
      const result = PartCreateSchema.safeParse({
        ...validPart,
        minStock: -5
      })
      expect(result.success).toBe(false)
    })
  })
})
