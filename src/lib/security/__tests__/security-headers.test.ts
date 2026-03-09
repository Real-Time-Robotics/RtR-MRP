import { describe, it, expect } from 'vitest';
import { securityHeaders, hstsHeader, getSecurityHeadersConfig, applySecurityHeaders, securityUtils } from '../security-headers';

describe('Security Headers', () => {
  describe('securityHeaders', () => {
    it('should include X-Frame-Options', () => {
      const header = securityHeaders.find(h => h.key === 'X-Frame-Options');
      expect(header).toBeDefined();
      expect(header!.value).toBe('DENY');
    });

    it('should include X-Content-Type-Options', () => {
      const header = securityHeaders.find(h => h.key === 'X-Content-Type-Options');
      expect(header).toBeDefined();
      expect(header!.value).toBe('nosniff');
    });

    it('should include X-XSS-Protection', () => {
      const header = securityHeaders.find(h => h.key === 'X-XSS-Protection');
      expect(header).toBeDefined();
    });

    it('should include Referrer-Policy', () => {
      const header = securityHeaders.find(h => h.key === 'Referrer-Policy');
      expect(header).toBeDefined();
    });

    it('should include Permissions-Policy', () => {
      const header = securityHeaders.find(h => h.key === 'Permissions-Policy');
      expect(header).toBeDefined();
    });

    it('should include Content-Security-Policy', () => {
      const header = securityHeaders.find(h => h.key === 'Content-Security-Policy');
      expect(header).toBeDefined();
      expect(header!.value).toContain("default-src 'self'");
    });
  });

  describe('hstsHeader', () => {
    it('should define HSTS header', () => {
      expect(hstsHeader.key).toBe('Strict-Transport-Security');
      expect(hstsHeader.value).toContain('max-age=');
    });
  });

  describe('getSecurityHeadersConfig', () => {
    it('should return config object with headers function', () => {
      const config = getSecurityHeadersConfig();
      expect(typeof config.headers).toBe('function');
    });

    it('should return headers for all paths', async () => {
      const config = getSecurityHeadersConfig();
      const result = await config.headers();
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('/:path*');
      expect(result[0].headers.length).toBeGreaterThan(0);
    });
  });

  describe('applySecurityHeaders', () => {
    it('should add security headers to response', () => {
      const response = new Response('test', { status: 200 });
      const secured = applySecurityHeaders(response);
      expect(secured.headers.get('X-Frame-Options')).toBe('DENY');
      expect(secured.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should preserve original response status', () => {
      const response = new Response('test', { status: 404 });
      const secured = applySecurityHeaders(response);
      expect(secured.status).toBe(404);
    });
  });

  describe('securityUtils', () => {
    describe('hasInjectionPattern', () => {
      it('should detect script injection', () => {
        expect(securityUtils.hasInjectionPattern('<script>alert(1)</script>')).toBe(true);
      });

      it('should detect javascript: protocol', () => {
        expect(securityUtils.hasInjectionPattern('javascript:alert(1)')).toBe(true);
      });

      it('should detect event handlers', () => {
        expect(securityUtils.hasInjectionPattern('onload=alert(1)')).toBe(true);
      });

      it('should detect SQL injection', () => {
        expect(securityUtils.hasInjectionPattern('union select * from users')).toBe(true);
      });

      it('should allow safe input', () => {
        expect(securityUtils.hasInjectionPattern('Hello World')).toBe(false);
      });
    });

    describe('sanitizeFilename', () => {
      it('should remove special characters', () => {
        expect(securityUtils.sanitizeFilename('file<>name.txt')).toBe('file__name.txt');
      });

      it('should remove double dots', () => {
        expect(securityUtils.sanitizeFilename('file..name.txt')).toBe('file.name.txt');
      });

      it('should truncate long filenames', () => {
        const longName = 'a'.repeat(300) + '.txt';
        expect(securityUtils.sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
      });

      it('should keep valid characters', () => {
        expect(securityUtils.sanitizeFilename('valid-file_name.txt')).toBe('valid-file_name.txt');
      });
    });

    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(securityUtils.isValidEmail('test@example.com')).toBe(true);
        expect(securityUtils.isValidEmail('user.name@domain.co.uk')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(securityUtils.isValidEmail('not-an-email')).toBe(false);
        expect(securityUtils.isValidEmail('@domain.com')).toBe(false);
        expect(securityUtils.isValidEmail('user@')).toBe(false);
      });
    });

    describe('checkPasswordStrength', () => {
      it('should accept strong password', () => {
        const result = securityUtils.checkPasswordStrength('MyStr0ng!');
        expect(result.strong).toBe(true);
        expect(result.issues).toHaveLength(0);
      });

      it('should reject short password', () => {
        const result = securityUtils.checkPasswordStrength('Ab1');
        expect(result.strong).toBe(false);
        expect(result.issues).toContain('Password must be at least 8 characters');
      });

      it('should require uppercase', () => {
        const result = securityUtils.checkPasswordStrength('lowercase123');
        expect(result.issues).toContain('Password must contain an uppercase letter');
      });

      it('should require lowercase', () => {
        const result = securityUtils.checkPasswordStrength('UPPERCASE123');
        expect(result.issues).toContain('Password must contain a lowercase letter');
      });

      it('should require numbers', () => {
        const result = securityUtils.checkPasswordStrength('NoNumbersHere');
        expect(result.issues).toContain('Password must contain a number');
      });
    });
  });
});
