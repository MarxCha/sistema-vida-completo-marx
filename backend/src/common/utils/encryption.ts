// src/common/utils/encryption.ts
import * as crypto from 'crypto';
import config from '../../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Convertir la clave hex a Buffer
const getKey = (): Buffer => {
  const keyHex = config.encryption.key;
  if (keyHex.length !== 64) {
    throw new Error('La clave de cifrado debe tener 64 caracteres hexadecimales (32 bytes)');
  }
  return Buffer.from(keyHex, 'hex');
};

/**
 * Cifra un texto plano usando AES-256-GCM
 * @param plaintext - Texto a cifrar
 * @returns Cadena cifrada en formato: iv:authTag:ciphertext (hex)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descifra un texto cifrado con AES-256-GCM
 * @param ciphertext - Texto cifrado en formato: iv:authTag:encrypted
 * @returns Texto plano original
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Formato de texto cifrado inválido');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Cifra un objeto JSON
 */
export function encryptJSON(data: any): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Descifra a un objeto JSON
 */
export function decryptJSON<T = any>(ciphertext: string): T {
  const plaintext = decrypt(ciphertext);
  return JSON.parse(plaintext) as T;
}

/**
 * Genera un hash SHA-256 de un string o buffer
 */
export function hashSHA256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Genera un token seguro aleatorio
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Compara de manera segura dos strings (previene timing attacks)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
