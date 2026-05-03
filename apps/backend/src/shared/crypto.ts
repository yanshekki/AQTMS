// ── AES-256-GCM Encryption Utility ──
// Encrypts/decrypts sensitive data at rest (API keys, secrets).

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Encrypts plaintext using AES-256-GCM.
 * @returns `iv:tag:ciphertext` hex-encoded string
 */
export function encrypt(text: string, secretKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(secretKey, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypts ciphertext produced by encrypt().
 * @throws {Error} if decryption fails (wrong key, tampered data)
 */
export function decrypt(encryptedText: string, secretKey: string): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    throw new Error('Invalid encrypted format: expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, encrypted] = encryptedText.split(':');

  if (!ivHex || !tagHex || !encrypted) {
    throw new Error('Malformed encrypted data');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(secretKey, 'hex'), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Validates that an encryption key is 64 hex chars (32 bytes).
 */
export function validateEncryptionKey(key: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Generates a secure 32-byte encryption key (64 hex chars).
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
