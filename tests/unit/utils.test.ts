import { describe, it, expect } from 'vitest';
import { sanitizeWaNumber, isMobileNumber, slugify } from '@/lib/utils';

describe('Utils: WhatsApp Sanitization', () => {
  it('should convert local format (08xx) to international (628xx)', () => {
    expect(sanitizeWaNumber('08123456789')).toBe('628123456789');
  });

  it('should handle already international format (628xx)', () => {
    expect(sanitizeWaNumber('628123456789')).toBe('628123456789');
  });

  it('should clean symbols and spaces (+62 812-3456-789)', () => {
    expect(sanitizeWaNumber('+62 812-3456-789')).toBe('628123456789');
  });

  it('should reject landline numbers (0361 / 62361)', () => {
    expect(sanitizeWaNumber('0361234567')).toBe(null);
    expect(sanitizeWaNumber('62361234567')).toBe(null);
  });

  it('should reject too short or too long numbers', () => {
    expect(sanitizeWaNumber('0812')).toBe(null);
    expect(sanitizeWaNumber('08123456789012345')).toBe(null);
  });
});

describe('Utils: slugify', () => {
  it('should convert text to URL friendly slug', () => {
    expect(slugify('Rumah Makan Padang')).toBe('rumah-makan-padang');
    expect(slugify('  Hello WORLD!!!  ')).toBe('hello-world');
  });
});
