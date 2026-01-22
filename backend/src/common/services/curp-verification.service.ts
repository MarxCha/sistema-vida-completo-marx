// src/common/services/curp-verification.service.ts
/**
 * Servicio de Verificación de CURP
 *
 * Valida CURPs contra la API de RENAPO (Registro Nacional de Población)
 * con fallback a validación local cuando la API no está disponible.
 *
 * Configuración:
 * - CURP_API_ENABLED: 'true' | 'false' - Habilitar verificación remota
 * - CURP_API_URL: URL de la API de RENAPO (opcional, usa default)
 * - CURP_API_KEY: API key si es requerida
 *
 * La API oficial de RENAPO requiere convenio institucional.
 * En desarrollo, usa validación local de formato y estructura.
 */

import config from '../../config';
import { logger } from './logger.service';
import { cacheService, CACHE_PREFIXES } from './cache.service';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface CURPValidationResult {
  isValid: boolean;
  isVerified: boolean; // true si fue verificado con API externa
  curp: string;
  data?: CURPData;
  error?: string;
  source: 'api' | 'local' | 'cache';
}

export interface CURPData {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: string;
  sexo?: 'H' | 'M';
  entidadNacimiento?: string;
  nacionalidad?: string;
  documentoProbatorio?: string;
}

interface CachedCURPResult {
  result: CURPValidationResult;
  cachedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const CURP_CONFIG = {
  apiEnabled: process.env.CURP_API_ENABLED === 'true',
  apiUrl: process.env.CURP_API_URL || 'https://www.gob.mx/curp/api',
  apiKey: process.env.CURP_API_KEY,
  cacheTTL: 24 * 60 * 60, // 24 horas
};

// Códigos de entidades federativas
const ENTIDADES: Record<string, string> = {
  AS: 'Aguascalientes',
  BC: 'Baja California',
  BS: 'Baja California Sur',
  CC: 'Campeche',
  CL: 'Coahuila',
  CM: 'Colima',
  CS: 'Chiapas',
  CH: 'Chihuahua',
  DF: 'Ciudad de México',
  DG: 'Durango',
  GT: 'Guanajuato',
  GR: 'Guerrero',
  HG: 'Hidalgo',
  JC: 'Jalisco',
  MC: 'Estado de México',
  MN: 'Michoacán',
  MS: 'Morelos',
  NT: 'Nayarit',
  NL: 'Nuevo León',
  OC: 'Oaxaca',
  PL: 'Puebla',
  QT: 'Querétaro',
  QR: 'Quintana Roo',
  SP: 'San Luis Potosí',
  SL: 'Sinaloa',
  SR: 'Sonora',
  TC: 'Tabasco',
  TS: 'Tamaulipas',
  TL: 'Tlaxcala',
  VZ: 'Veracruz',
  YN: 'Yucatán',
  ZS: 'Zacatecas',
  NE: 'Nacido en el Extranjero',
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

class CURPVerificationService {
  /**
   * Verifica un CURP (con API si está habilitada, sino validación local)
   */
  async verify(curp: string): Promise<CURPValidationResult> {
    const normalizedCURP = curp.toUpperCase().trim();

    // Validación de formato básica primero
    const formatValidation = this.validateFormat(normalizedCURP);
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    // Verificar cache
    const cached = await this.getCachedResult(normalizedCURP);
    if (cached) {
      logger.debug('CURP encontrado en cache', { curp: normalizedCURP });
      return { ...cached.result, source: 'cache' };
    }

    // Si la API está habilitada, intentar verificación remota
    if (CURP_CONFIG.apiEnabled) {
      try {
        const apiResult = await this.verifyWithAPI(normalizedCURP);
        await this.cacheResult(normalizedCURP, apiResult);
        return apiResult;
      } catch (error) {
        logger.warn('Error verificando CURP con API, usando validación local', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Fallback a validación local
      }
    }

    // Validación local (estructura y checksums)
    const localResult = this.validateLocally(normalizedCURP);
    await this.cacheResult(normalizedCURP, localResult);
    return localResult;
  }

  /**
   * Valida solo el formato del CURP (sin verificación externa)
   */
  validateFormat(curp: string): CURPValidationResult {
    const normalizedCURP = curp.toUpperCase().trim();

    // Regex para validar estructura del CURP
    // Formato: AAAA000000HSSSAAA00
    // - 4 letras iniciales (apellidos y nombre)
    // - 6 dígitos (fecha de nacimiento AAMMDD)
    // - 1 letra (sexo H/M)
    // - 2 letras (entidad federativa)
    // - 3 letras (consonantes internas)
    // - 1 caracter (dígito verificador o letra para homoclave)
    // - 1 dígito (dígito verificador)
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[A-Z]{3}[0-9A-Z][0-9]$/;

    if (!curpRegex.test(normalizedCURP)) {
      return {
        isValid: false,
        isVerified: false,
        curp: normalizedCURP,
        error: 'Formato de CURP inválido',
        source: 'local',
      };
    }

    // Validar que la entidad federativa sea válida
    const entidad = normalizedCURP.substring(11, 13);
    if (!ENTIDADES[entidad]) {
      return {
        isValid: false,
        isVerified: false,
        curp: normalizedCURP,
        error: 'Entidad federativa inválida',
        source: 'local',
      };
    }

    // Validar fecha de nacimiento
    const year = parseInt(normalizedCURP.substring(4, 6));
    const month = parseInt(normalizedCURP.substring(6, 8));
    const day = parseInt(normalizedCURP.substring(8, 10));

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return {
        isValid: false,
        isVerified: false,
        curp: normalizedCURP,
        error: 'Fecha de nacimiento inválida',
        source: 'local',
      };
    }

    return {
      isValid: true,
      isVerified: false,
      curp: normalizedCURP,
      source: 'local',
    };
  }

  /**
   * Validación local completa (formato + estructura + checksum)
   */
  private validateLocally(curp: string): CURPValidationResult {
    const formatResult = this.validateFormat(curp);
    if (!formatResult.isValid) {
      return formatResult;
    }

    // Extraer datos del CURP
    const data = this.extractDataFromCURP(curp);

    // Verificar dígito verificador
    const isChecksumValid = this.verifyChecksum(curp);

    if (!isChecksumValid) {
      return {
        isValid: false,
        isVerified: false,
        curp,
        error: 'Dígito verificador inválido',
        source: 'local',
      };
    }

    return {
      isValid: true,
      isVerified: false, // No verificado con API
      curp,
      data,
      source: 'local',
    };
  }

  /**
   * Verifica CURP con la API de RENAPO
   */
  private async verifyWithAPI(curp: string): Promise<CURPValidationResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${CURP_CONFIG.apiUrl}/consulta/${curp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...(CURP_CONFIG.apiKey ? { 'Authorization': `Bearer ${CURP_CONFIG.apiKey}` } : {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            isValid: false,
            isVerified: true,
            curp,
            error: 'CURP no encontrado en el registro nacional',
            source: 'api',
          };
        }
        throw new Error(`API responded with status ${response.status}`);
      }

      const apiData = await response.json() as Record<string, string | undefined>;

      // Mapear respuesta de la API al formato interno
      const data: CURPData = {
        nombre: apiData.nombres || apiData.nombre,
        primerApellido: apiData.primerApellido || apiData.apellido1,
        segundoApellido: apiData.segundoApellido || apiData.apellido2,
        fechaNacimiento: apiData.fechaNacimiento,
        sexo: apiData.sexo as 'H' | 'M' | undefined,
        entidadNacimiento: apiData.entidad || apiData.entidadNacimiento,
        nacionalidad: apiData.nacionalidad,
        documentoProbatorio: apiData.docProbatorio,
      };

      logger.info('CURP verificado con API', { curp });

      return {
        isValid: true,
        isVerified: true,
        curp,
        data,
        source: 'api',
      };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout al conectar con API de RENAPO');
      }
      throw error;
    }
  }

  /**
   * Extrae información del CURP (sin verificación externa)
   */
  private extractDataFromCURP(curp: string): CURPData {
    const year = parseInt(curp.substring(4, 6));
    const month = curp.substring(6, 8);
    const day = curp.substring(8, 10);
    const sexo = curp.charAt(10) as 'H' | 'M';
    const entidadCode = curp.substring(11, 13);

    // Determinar siglo (asume que años > 30 son 1900s, sino 2000s)
    const fullYear = year > 30 ? 1900 + year : 2000 + year;

    return {
      fechaNacimiento: `${fullYear}-${month}-${day}`,
      sexo,
      entidadNacimiento: ENTIDADES[entidadCode] || entidadCode,
    };
  }

  /**
   * Verifica el dígito verificador del CURP
   * Algoritmo oficial de RENAPO
   */
  private verifyChecksum(curp: string): boolean {
    const dictionary = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    let sum = 0;

    for (let i = 0; i < 17; i++) {
      const char = curp.charAt(i);
      const value = dictionary.indexOf(char);
      if (value === -1) return false;
      sum += value * (18 - i);
    }

    const expectedDigit = (10 - (sum % 10)) % 10;
    const actualDigit = parseInt(curp.charAt(17));

    return expectedDigit === actualDigit;
  }

  /**
   * Obtiene resultado cacheado
   */
  private async getCachedResult(curp: string): Promise<CachedCURPResult | null> {
    return await cacheService.get<CachedCURPResult>(curp, {
      prefix: CACHE_PREFIXES.CURP_VERIFICATION,
    });
  }

  /**
   * Cachea resultado de verificación
   */
  private async cacheResult(curp: string, result: CURPValidationResult): Promise<void> {
    const cached: CachedCURPResult = {
      result,
      cachedAt: new Date().toISOString(),
    };

    await cacheService.set(curp, cached, {
      prefix: CACHE_PREFIXES.CURP_VERIFICATION,
      ttl: CURP_CONFIG.cacheTTL,
    });
  }

  /**
   * Obtiene información del servicio
   */
  getServiceInfo(): { apiEnabled: boolean; apiUrl: string } {
    return {
      apiEnabled: CURP_CONFIG.apiEnabled,
      apiUrl: CURP_CONFIG.apiEnabled ? CURP_CONFIG.apiUrl : 'N/A (modo local)',
    };
  }
}

export const curpVerificationService = new CURPVerificationService();
export default curpVerificationService;
