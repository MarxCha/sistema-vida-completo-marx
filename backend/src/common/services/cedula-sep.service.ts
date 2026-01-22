// src/common/services/cedula-sep.service.ts
/**
 * Servicio de Verificación de Cédulas Profesionales - SEP
 *
 * Consulta el registro público de cédulas profesionales de la
 * Secretaría de Educación Pública (SEP) de México.
 *
 * API: http://search.sep.gob.mx/solr/cedulasCore/select
 * Fuente: https://github.com/fmacias64/cedulas-sep-api
 *
 * Útil para verificar credenciales de:
 * - Médicos
 * - Enfermeros
 * - Otros profesionales de salud
 */

import { logger } from './logger.service';
import { cacheService } from './cache.service';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const SEP_CONFIG = {
  baseUrl: 'https://search.sep.gob.mx/solr/cedulasCore/select',
  timeout: 10000, // 10 segundos
  cacheTTL: 7 * 24 * 60 * 60, // 7 días (las cédulas no cambian frecuentemente)
  enabled: process.env.SEP_API_ENABLED !== 'false',
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface CedulaInfo {
  numCedula: string;
  nombre: string;
  paterno: string;
  materno: string;
  titulo: string;
  institucion: string;
  anioRegistro: number;
  tipo: string;
  genero?: string;
}

export interface CedulaVerificationResult {
  isValid: boolean;
  isVerified: boolean;
  cedula?: CedulaInfo;
  matchScore?: number;
  error?: string;
  source: 'api' | 'cache' | 'format_only';
}

interface SEPResponse {
  responseHeader: {
    status: number;
    QTime: number;
  };
  response: {
    numFound: number;
    start: number;
    docs: SEPDocument[];
  };
}

interface SEPDocument {
  id: string;
  numCedula: string;
  nombre: string;
  paterno: string;
  materno: string;
  titulo: string;
  institucion: string;
  anioRegistro: number;
  tipo: string;
  genero?: string;
  score?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

class CedulaSEPService {
  /**
   * Verifica una cédula profesional por número
   */
  async verifyByNumber(cedulaNumber: string): Promise<CedulaVerificationResult> {
    const normalized = this.normalizeCedula(cedulaNumber);

    if (!this.validateFormat(normalized)) {
      return {
        isValid: false,
        isVerified: false,
        error: 'Formato de cédula inválido (debe ser 7-8 dígitos)',
        source: 'format_only',
      };
    }

    // Verificar cache
    const cached = await this.getCached(normalized);
    if (cached) {
      return { ...cached, source: 'cache' };
    }

    if (!SEP_CONFIG.enabled) {
      return {
        isValid: true,
        isVerified: false,
        error: 'Verificación SEP deshabilitada',
        source: 'format_only',
      };
    }

    try {
      const result = await this.queryAPI(`numCedula:${normalized}`);

      if (result.response.numFound === 0) {
        const notFoundResult: CedulaVerificationResult = {
          isValid: false,
          isVerified: true,
          error: 'Cédula no encontrada en el registro de la SEP',
          source: 'api',
        };
        await this.setCache(normalized, notFoundResult);
        return notFoundResult;
      }

      const doc = result.response.docs[0];
      const verifiedResult: CedulaVerificationResult = {
        isValid: true,
        isVerified: true,
        cedula: this.mapDocument(doc),
        matchScore: doc.score,
        source: 'api',
      };

      await this.setCache(normalized, verifiedResult);
      return verifiedResult;
    } catch (error) {
      logger.error('Error consultando API SEP', error);
      return {
        isValid: true, // Formato válido
        isVerified: false, // No pudimos verificar
        error: 'Error conectando con SEP, cédula no verificada',
        source: 'format_only',
      };
    }
  }

  /**
   * Busca cédulas por nombre del profesional
   */
  async searchByName(
    nombre: string,
    paterno?: string,
    materno?: string
  ): Promise<CedulaInfo[]> {
    if (!SEP_CONFIG.enabled) {
      return [];
    }

    const parts = [nombre];
    if (paterno) parts.push(paterno);
    if (materno) parts.push(materno);

    const query = parts.join(' ');

    try {
      const result = await this.queryAPI(query);
      return result.response.docs.map(doc => this.mapDocument(doc));
    } catch (error) {
      logger.error('Error buscando cédulas por nombre', error);
      return [];
    }
  }

  /**
   * Verifica si una cédula corresponde a un profesional de salud
   */
  async verifyHealthProfessional(
    cedulaNumber: string,
    expectedName?: string
  ): Promise<{
    isHealthProfessional: boolean;
    specialty?: string;
    matchesName: boolean;
    details?: CedulaInfo;
  }> {
    const result = await this.verifyByNumber(cedulaNumber);

    if (!result.isValid || !result.cedula) {
      return {
        isHealthProfessional: false,
        matchesName: false,
      };
    }

    // Títulos relacionados con salud
    const healthTitles = [
      'médico', 'medicina', 'doctor', 'cirujano',
      'enfermero', 'enfermería', 'enfermera',
      'paramédico', 'paramédica', 'urgencias',
      'pediatr', 'cardiol', 'neurol', 'oncol',
      'ginecol', 'traumat', 'anestesi', 'radiol',
      'psiquiatr', 'dermatol', 'oftalmol', 'otorrino',
      'nutrici', 'nutriólogo', 'fisioterapi',
      'odontól', 'dentista', 'estomatol',
      'farmac', 'químico farmac', 'bioquímic',
      'laboratorista', 'patólog', 'anatomopatol',
    ];

    const titulo = result.cedula.titulo.toLowerCase();
    const isHealth = healthTitles.some(t => titulo.includes(t));

    // Verificar nombre si se proporciona
    let matchesName = true;
    if (expectedName && result.cedula) {
      const fullName = `${result.cedula.nombre} ${result.cedula.paterno} ${result.cedula.materno}`.toLowerCase();
      const searchName = expectedName.toLowerCase();
      matchesName = fullName.includes(searchName) || searchName.includes(fullName.split(' ')[0]);
    }

    return {
      isHealthProfessional: isHealth,
      specialty: result.cedula.titulo,
      matchesName,
      details: result.cedula,
    };
  }

  /**
   * Obtiene información del servicio
   */
  getServiceInfo(): { enabled: boolean; apiUrl: string } {
    return {
      enabled: SEP_CONFIG.enabled,
      apiUrl: SEP_CONFIG.baseUrl,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private normalizeCedula(cedula: string): string {
    return cedula.replace(/[\s-]/g, '').trim();
  }

  private validateFormat(cedula: string): boolean {
    return /^\d{7,8}$/.test(cedula);
  }

  private async queryAPI(query: string): Promise<SEPResponse> {
    const params = new URLSearchParams({
      q: query,
      fl: '*,score',
      start: '0',
      rows: '10',
      wt: 'json',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEP_CONFIG.timeout);

    try {
      const response = await fetch(`${SEP_CONFIG.baseUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`SEP API respondió con status ${response.status}`);
      }

      return await response.json() as SEPResponse;
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout consultando API de SEP');
      }
      throw error;
    }
  }

  private mapDocument(doc: SEPDocument): CedulaInfo {
    return {
      numCedula: doc.numCedula,
      nombre: doc.nombre,
      paterno: doc.paterno,
      materno: doc.materno,
      titulo: doc.titulo,
      institucion: doc.institucion,
      anioRegistro: doc.anioRegistro,
      tipo: doc.tipo,
      genero: doc.genero,
    };
  }

  private async getCached(cedula: string): Promise<CedulaVerificationResult | null> {
    return await cacheService.get<CedulaVerificationResult>(cedula, {
      prefix: 'cedula:sep',
    });
  }

  private async setCache(cedula: string, result: CedulaVerificationResult): Promise<void> {
    await cacheService.set(cedula, result, {
      prefix: 'cedula:sep',
      ttl: SEP_CONFIG.cacheTTL,
    });
  }
}

export const cedulaSEPService = new CedulaSEPService();
export default cedulaSEPService;
