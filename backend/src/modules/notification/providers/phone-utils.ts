// src/modules/notification/providers/phone-utils.ts

import { logger } from '../../../common/services/logger.service';

/**
 * Utilidades compartidas para formateo de números telefónicos mexicanos.
 * Números mexicanos válidos en E.164: +52 + 10 dígitos = 12 dígitos totales.
 */

/**
 * Limpia y normaliza un número telefónico a formato E.164 para México.
 */
function normalizeToE164(phone: string): string {
  // Remover todo excepto dígitos y el + inicial
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Si tiene + intercalado (malformado), eliminar todos los + y re-procesar
  if (cleaned.indexOf('+') > 0) {
    cleaned = cleaned.replace(/\+/g, '');
  }

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('52')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+52' + cleaned;
    }
  }

  // Validar longitud E.164 para México: +52 + 10 dígitos = 12 chars
  const digits = cleaned.replace('+', '');
  if (digits.length < 12 || digits.length > 13) {
    logger.warn('Número telefónico con longitud inválida', {
      original: phone,
      formatted: cleaned,
      digitCount: String(digits.length),
      expected: '12-13',
    });
  }

  return cleaned;
}

/**
 * Formatea número de teléfono a E.164 para SMS.
 */
export function formatPhoneForSMS(phone: string): string {
  return normalizeToE164(phone);
}

/**
 * Formatea número de teléfono para WhatsApp (E.164 sin prefix whatsapp:).
 */
export function formatPhoneForWhatsApp(phone: string): string {
  return normalizeToE164(phone);
}

/**
 * Extrae número limpio sin + para WABA (Meta Cloud API espera solo dígitos).
 */
export function formatPhoneForWABA(phone: string): string {
  const e164 = normalizeToE164(phone);
  return e164.replace('+', '');
}
