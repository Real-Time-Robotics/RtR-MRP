import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  unescapeHtml,
  stripTags,
  sanitize,
  sanitizeObject,
  sanitizeUrl,
  escapeSql,
  sanitizeSearchQuery,
  sanitizeFilename,
  createSafeHtml,
  isValidEmail,
  isValidPhone,
  isValidPartNumber,
  sanitizePartNumber,
} from '../sanitize';

// =============================================================================
// escapeHtml
// =============================================================================

describe('escapeHtml', () => {
  it('should escape all HTML special characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#x27;');
    expect(escapeHtml('/')).toBe('&#x2F;');
    expect(escapeHtml('`')).toBe('&#x60;');
    expect(escapeHtml('=')).toBe('&#x3D;');
  });

  it('should escape a string containing mixed HTML entities', () => {
    expect(escapeHtml('<div class="test">')).toBe(
      '&lt;div class&amp;#x3D;&quot;test&quot;&gt;'.replace(
        '&amp;#x3D;',
        '&#x3D;'
      )
    );
    // More straightforward check:
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeHtml(null as any)).toBe('');
    expect(escapeHtml(undefined as any)).toBe('');
    expect(escapeHtml(123 as any)).toBe('');
  });

  it('should leave safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('abc123')).toBe('abc123');
  });
});

// =============================================================================
// unescapeHtml
// =============================================================================

describe('unescapeHtml', () => {
  it('should reverse escapeHtml for all entities', () => {
    expect(unescapeHtml('&amp;')).toBe('&');
    expect(unescapeHtml('&lt;')).toBe('<');
    expect(unescapeHtml('&gt;')).toBe('>');
    expect(unescapeHtml('&quot;')).toBe('"');
    expect(unescapeHtml('&#x27;')).toBe("'");
    expect(unescapeHtml('&#x2F;')).toBe('/');
    expect(unescapeHtml('&#x60;')).toBe('`');
    expect(unescapeHtml('&#x3D;')).toBe('=');
  });

  it('should roundtrip with escapeHtml', () => {
    const original = '<div class="test">Hello & goodbye</div>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });

  it('should return empty string for non-string input', () => {
    expect(unescapeHtml(42 as any)).toBe('');
  });
});

// =============================================================================
// stripTags
// =============================================================================

describe('stripTags', () => {
  it('should remove all HTML tags', () => {
    expect(stripTags('<p>Hello</p>')).toBe('Hello');
    expect(stripTags('<script>alert("xss")</script>')).toBe('alert("xss")');
    expect(stripTags('<a href="http://example.com">Link</a>')).toBe('Link');
  });

  it('should handle nested tags', () => {
    expect(stripTags('<div><span>nested</span></div>')).toBe('nested');
  });

  it('should handle self-closing tags', () => {
    expect(stripTags('Hello<br/>World')).toBe('HelloWorld');
  });

  it('should return empty string for non-string input', () => {
    expect(stripTags(undefined as any)).toBe('');
  });
});

// =============================================================================
// sanitize (combines stripTags + escapeHtml)
// =============================================================================

describe('sanitize', () => {
  it('should strip tags and escape remaining HTML entities', () => {
    const input = '<script>alert("xss")</script>';
    const result = sanitize(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    // The alert("xss") inner text is kept but quotes are escaped
    expect(result).toContain('&quot;');
  });

  it('should handle event handler injection attempts', () => {
    const input = '<img onerror="alert(1)" src="x">';
    const result = sanitize(input);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('should preserve plain text with ampersand', () => {
    const result = sanitize('Tom & Jerry');
    expect(result).toBe('Tom &amp; Jerry');
  });
});

// =============================================================================
// sanitizeObject - recursive sanitization
// =============================================================================

describe('sanitizeObject', () => {
  it('should sanitize all string values in a flat object', () => {
    const obj = { name: '<b>Bold</b>', count: 5 };
    const result = sanitizeObject(obj);
    expect(result.name).not.toContain('<b>');
    expect(result.count).toBe(5);
  });

  it('should sanitize nested objects', () => {
    const obj = {
      user: {
        name: '<script>alert("xss")</script>',
        age: 30,
      },
    };
    const result = sanitizeObject(obj);
    expect(result.user.name).not.toContain('<script>');
    expect(result.user.age).toBe(30);
  });

  it('should sanitize arrays of strings', () => {
    const obj = {
      tags: ['<b>safe</b>', 'normal', '<img src=x onerror=alert(1)>'],
    };
    const result = sanitizeObject(obj);
    expect(result.tags[0]).not.toContain('<b>');
    expect(result.tags[1]).toBe('normal');
    expect(result.tags[2]).not.toContain('<img');
  });

  it('should sanitize arrays of objects', () => {
    const obj = {
      items: [
        { label: '<em>item1</em>' },
        { label: 'item2' },
      ],
    };
    const result = sanitizeObject(obj);
    expect(result.items[0].label).not.toContain('<em>');
    expect(result.items[1].label).toBe('item2');
  });

  it('should preserve Date objects without sanitizing them', () => {
    const date = new Date('2025-01-01');
    const obj = { created: date, name: '<b>test</b>' };
    const result = sanitizeObject(obj);
    expect(result.created).toBe(date);
    expect(result.name).not.toContain('<b>');
  });

  it('should preserve null values in arrays', () => {
    const obj = { items: [null, 42, '<b>x</b>'] };
    const result = sanitizeObject(obj);
    expect(result.items[0]).toBeNull();
    expect(result.items[1]).toBe(42);
    expect(result.items[2]).not.toContain('<b>');
  });
});

// =============================================================================
// sanitizeUrl - block dangerous schemes
// =============================================================================

describe('sanitizeUrl', () => {
  it('should block javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
  });

  it('should block data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('should block vbscript: URLs', () => {
    expect(sanitizeUrl('vbscript:MsgBox("XSS")')).toBe('');
  });

  it('should block file: URLs', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
  });

  it('should allow http and https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should allow relative URLs', () => {
    expect(sanitizeUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeUrl('/api/parts')).toBe('/api/parts');
  });

  it('should allow mailto: and tel: URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should block unknown schemes that contain a colon', () => {
    expect(sanitizeUrl('custom:something')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeUrl(undefined as any)).toBe('');
  });
});

// =============================================================================
// escapeSql
// =============================================================================

describe('escapeSql', () => {
  it('should escape single quotes', () => {
    expect(escapeSql("O'Reilly")).toBe("O''Reilly");
  });

  it('should escape backslashes', () => {
    expect(escapeSql('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('should escape null bytes, newlines, carriage returns, and ctrl-Z', () => {
    expect(escapeSql('\x00')).toBe('\\0');
    expect(escapeSql('\n')).toBe('\\n');
    expect(escapeSql('\r')).toBe('\\r');
    expect(escapeSql('\x1a')).toBe('\\Z');
  });

  it('should return empty string for non-string input', () => {
    expect(escapeSql(null as any)).toBe('');
  });
});

// =============================================================================
// sanitizeSearchQuery - SQL injection prevention
// =============================================================================

describe('sanitizeSearchQuery', () => {
  it('should remove SQL keywords', () => {
    const result = sanitizeSearchQuery('SELECT * FROM users');
    expect(result).not.toMatch(/SELECT/i);
    expect(result).not.toMatch(/FROM/i);
  });

  it('should remove dangerous characters (semicolons, quotes, backslashes)', () => {
    const result = sanitizeSearchQuery("test'; DROP TABLE users;--");
    expect(result).not.toContain(';');
    expect(result).not.toContain("'");
    expect(result).not.toContain('\\');
  });

  it('should truncate to maxLength', () => {
    const longQuery = 'a'.repeat(300);
    const result = sanitizeSearchQuery(longQuery, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('should use default maxLength of 200', () => {
    const longQuery = 'a'.repeat(300);
    const result = sanitizeSearchQuery(longQuery);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeSearchQuery(undefined as any)).toBe('');
  });

  it('should preserve normal search text', () => {
    expect(sanitizeSearchQuery('bolt M8 stainless')).toBe('bolt M8 stainless');
  });
});

// =============================================================================
// sanitizeFilename
// =============================================================================

describe('sanitizeFilename', () => {
  it('should replace path separators with underscores', () => {
    expect(sanitizeFilename('path/to/file.txt')).not.toContain('/');
    expect(sanitizeFilename('path\\to\\file.txt')).not.toContain('\\');
  });

  it('should prevent path traversal with ..', () => {
    const result = sanitizeFilename('../../etc/passwd');
    expect(result).not.toContain('..');
  });

  it('should remove leading and trailing dots/spaces', () => {
    const result = sanitizeFilename('.hidden');
    expect(result).not.toMatch(/^\./);
  });

  it('should return "untitled" for empty result', () => {
    // An empty string after sanitization yields 'untitled'
    expect(sanitizeFilename('')).toBe('untitled');
  });

  it('should handle dots-only input (path traversal with dots)', () => {
    // '...' -> '..' replaced by '_' -> '._.' -> strip leading/trailing dots -> '_'
    const result = sanitizeFilename('...');
    expect(result).not.toContain('..');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should return empty string for non-string input', () => {
    expect(sanitizeFilename(null as any)).toBe('');
  });

  it('should truncate long filenames to 255 characters', () => {
    const longName = 'a'.repeat(300) + '.txt';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });
});

// =============================================================================
// createSafeHtml
// =============================================================================

describe('createSafeHtml', () => {
  it('should replace placeholders with sanitized values (strips tags)', () => {
    const template = '<p>{{name}}</p>';
    const data = { name: '<script>alert(1)</script>' };
    const result = createSafeHtml(template, data);
    // sanitizeObject strips tags first, leaving 'alert(1)', then escapeHtml (no special chars)
    expect(result).not.toContain('<script>');
    expect(result).toBe('<p>alert(1)</p>');
  });

  it('should escape HTML entities in placeholder values', () => {
    const template = '<p>{{name}}</p>';
    const data = { name: 'A & B <C>' };
    const result = createSafeHtml(template, data);
    // stripTags removes <C>, leaving 'A & B ', then escapeHtml -> 'A &amp; B '
    expect(result).toContain('&amp;');
    expect(result).not.toContain('&amp;amp;');
  });

  it('should replace missing placeholders with empty string', () => {
    const template = 'Hello {{name}}, age {{age}}';
    const data = { name: 'Alice' };
    const result = createSafeHtml(template, data);
    expect(result).toContain('Alice');
    expect(result).toContain('age ');
    expect(result).not.toContain('{{age}}');
  });
});

// =============================================================================
// Validation helpers
// =============================================================================

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@missing-local.com')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
  });
});

describe('isValidPartNumber', () => {
  it('should accept valid part numbers', () => {
    expect(isValidPartNumber('ABC-123')).toBe(true);
    expect(isValidPartNumber('PART-001-A')).toBe(true);
  });

  it('should reject part numbers that are too short or have invalid chars', () => {
    expect(isValidPartNumber('AB')).toBe(false);
    expect(isValidPartNumber('a-')).toBe(false);
  });
});

describe('sanitizePartNumber', () => {
  it('should uppercase and strip invalid characters', () => {
    expect(sanitizePartNumber('abc-123!')).toBe('ABC-123');
  });

  it('should truncate to 50 characters', () => {
    const long = 'A'.repeat(60);
    expect(sanitizePartNumber(long).length).toBe(50);
  });
});
