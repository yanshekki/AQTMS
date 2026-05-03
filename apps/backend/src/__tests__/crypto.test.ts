// ── Crypto Utility Unit Tests ──

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, validateEncryptionKey, generateEncryptionKey } from '../shared/crypto';

describe('AES-256-GCM Encryption', () => {
  const validKey = generateEncryptionKey();

  it('should encrypt and decrypt successfully', () => {
    const plaintext = 'my-secret-api-key-12345';
    const encrypted = encrypt(plaintext, validKey);

    // Should not contain the original plaintext
    expect(encrypted).not.toContain(plaintext);
    // Should have iv:tag:ciphertext format
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted, validKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same input (unique IV)', () => {
    const plaintext = 'test-api-key';
    const enc1 = encrypt(plaintext, validKey);
    const enc2 = encrypt(plaintext, validKey);

    expect(enc1).not.toBe(enc2);
    // Both should decrypt to same plaintext
    expect(decrypt(enc1, validKey)).toBe(plaintext);
    expect(decrypt(enc2, validKey)).toBe(plaintext);
  });

  it('should throw on wrong encryption key', () => {
    const plaintext = 'test-key';
    const encrypted = encrypt(plaintext, validKey);
    const wrongKey = generateEncryptionKey();

    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('should throw on tampered ciphertext', () => {
    const plaintext = 'test-key';
    const encrypted = encrypt(plaintext, validKey);
    const tampered = encrypted.slice(0, -5) + 'abcde';

    expect(() => decrypt(tampered, validKey)).toThrow();
  });

  it('should throw on malformed input', () => {
    expect(() => decrypt('not-valid-format', validKey)).toThrow('Invalid encrypted format');
    expect(() => decrypt('', validKey)).toThrow('Invalid encrypted format');
  });

  it('should handle special characters', () => {
    const plaintext = '🔥 API-K3y!@#$%^&*()_+{}|:"<>?~`';
    const encrypted = encrypt(plaintext, validKey);
    expect(decrypt(encrypted, validKey)).toBe(plaintext);
  });

  it('should handle long API keys (512 chars)', () => {
    const longKey = 'x'.repeat(512);
    const encrypted = encrypt(longKey, validKey);
    expect(decrypt(encrypted, validKey)).toBe(longKey);
  });

  it('should validate correct encryption key format', () => {
    expect(validateEncryptionKey(validKey)).toBe(true);
    expect(validateEncryptionKey('abc')).toBe(false);
    expect(validateEncryptionKey('g'.repeat(64))).toBe(false);
    expect(validateEncryptionKey('z'.repeat(64))).toBe(false);
  });

  it('should generate valid 64-char hex key', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(validateEncryptionKey(key)).toBe(true);
  });
});
