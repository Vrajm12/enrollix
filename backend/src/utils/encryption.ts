import crypto from 'crypto';

/**
 * Encryption Utilities
 * For encrypting sensitive data like phone numbers, SSN, etc.
 *
 * IMPORTANT: In production, use environment-based encryption keys
 * stored in secure key management system (AWS KMS, HashiCorp Vault, etc.)
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  /**
   * Encrypt sensitive data
   * @param plaintext Data to encrypt
   * @returns base64 encoded encrypted data with IV and auth tag
   */
  static encrypt(plaintext: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
      return Buffer.from(combined, 'hex').toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param encrypted base64 encoded encrypted data
   * @returns decrypted plaintext
   */
  static decrypt(encrypted: string): string {
    try {
      const buffer = Buffer.from(encrypted, 'base64');
      const combined = buffer.toString('hex');
      
      // Extract parts: IV (32 chars) + authTag (32 chars) + encrypted (rest)
      const iv = Buffer.from(combined.slice(0, 32), 'hex');
      const authTag = Buffer.from(combined.slice(32, 64), 'hex');
      const encryptedData = combined.slice(64);
      
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way, for comparison)
   * @param data Data to hash
   * @returns hex hash
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
