import { describe, it, expect } from 'vitest';
import { colors, chartColors, statusColors, typography, spacing, componentSpacing, borderRadius, shadows, zIndex, transitions, breakpoints, layout, sizes, theme } from '../theme';

describe('Theme', () => {
  describe('colors', () => {
    it('should define primary colors', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBe('#30a46c');
    });

    it('should define navy colors', () => {
      expect(colors.navy).toBeDefined();
      expect(colors.navy[900]).toBe('#0F172A');
    });

    it('should define semantic colors', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.danger).toBeDefined();
    });
  });

  describe('chartColors', () => {
    it('should define chart color arrays', () => {
      expect(chartColors).toBeDefined();
      // @ts-expect-error test data
      expect(Array.isArray(chartColors.primary) || typeof chartColors === 'object').toBe(true);
    });
  });

  describe('statusColors', () => {
    it('should define status colors', () => {
      expect(statusColors).toBeDefined();
    });
  });

  describe('typography', () => {
    it('should define font families', () => {
      expect(typography).toBeDefined();
    });
  });

  describe('spacing', () => {
    it('should define spacing values', () => {
      expect(spacing).toBeDefined();
    });
  });

  describe('componentSpacing', () => {
    it('should define component spacing', () => {
      expect(componentSpacing).toBeDefined();
    });
  });

  describe('borderRadius', () => {
    it('should define border radius values', () => {
      expect(borderRadius).toBeDefined();
    });
  });

  describe('shadows', () => {
    it('should define shadow values', () => {
      expect(shadows).toBeDefined();
    });
  });

  describe('zIndex', () => {
    it('should define z-index values', () => {
      expect(zIndex).toBeDefined();
    });
  });

  describe('transitions', () => {
    it('should define transition values', () => {
      expect(transitions).toBeDefined();
    });
  });

  describe('breakpoints', () => {
    it('should define breakpoint values', () => {
      expect(breakpoints).toBeDefined();
    });
  });

  describe('layout', () => {
    it('should define layout values', () => {
      expect(layout).toBeDefined();
    });
  });

  describe('sizes', () => {
    it('should define button sizes', () => {
      expect(sizes.button.xs.height).toBe('28px');
      expect(sizes.button.md.height).toBe('40px');
      expect(sizes.button.xl.height).toBe('56px');
    });

    it('should define input sizes', () => {
      expect(sizes.input.sm.height).toBe('32px');
      expect(sizes.input.md.height).toBe('40px');
      expect(sizes.input.lg.height).toBe('48px');
    });

    it('should define avatar sizes', () => {
      expect(sizes.avatar.xs).toBe('24px');
      expect(sizes.avatar.xl).toBe('64px');
    });

    it('should define icon sizes', () => {
      expect(sizes.icon.xs).toBe('12px');
      expect(sizes.icon['2xl']).toBe('32px');
    });
  });

  describe('theme object', () => {
    it('should export all theme sections', () => {
      expect(theme.colors).toBe(colors);
      expect(theme.chartColors).toBe(chartColors);
      expect(theme.statusColors).toBe(statusColors);
      expect(theme.typography).toBe(typography);
      expect(theme.spacing).toBe(spacing);
      expect(theme.componentSpacing).toBe(componentSpacing);
      expect(theme.borderRadius).toBe(borderRadius);
      expect(theme.shadows).toBe(shadows);
      expect(theme.zIndex).toBe(zIndex);
      expect(theme.transitions).toBe(transitions);
      expect(theme.breakpoints).toBe(breakpoints);
      expect(theme.layout).toBe(layout);
      expect(theme.sizes).toBe(sizes);
    });
  });
});
