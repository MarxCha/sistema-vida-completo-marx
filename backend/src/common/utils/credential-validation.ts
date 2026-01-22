// src/common/utils/credential-validation.ts
/**
 * Utilidades para validación de credenciales profesionales médicas
 *
 * En México, las cédulas profesionales son emitidas por la SEP y tienen formato:
 * - 7-8 dígitos para profesionales
 * - Verificables en: https://www.cedulaprofesional.sep.gob.mx/
 *
 * Integración con API SEP para verificación real de cédulas.
 */

import { cedulaSEPService } from '../services/cedula-sep.service';

// Roles que requieren cédula profesional obligatoria
export const ROLES_REQUIRING_LICENSE = ['DOCTOR', 'NURSE'];

// Roles que la cédula es recomendada pero no obligatoria
export const ROLES_LICENSE_RECOMMENDED = ['PARAMEDIC', 'EMERGENCY_TECH'];

// Roles sin requisito de cédula
export const ROLES_NO_LICENSE = ['OTHER'];

/**
 * Resultado de la validación de credenciales
 */
export interface CredentialValidationResult {
  isValid: boolean;
  isVerified: boolean;
  requiresLicense: boolean;
  licenseRecommended: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Valida el formato de una cédula profesional mexicana
 *
 * @param license - Número de cédula profesional
 * @returns true si el formato es válido
 */
export function validateLicenseFormat(license: string): boolean {
  if (!license) return false;

  // Limpiar espacios y guiones
  const cleaned = license.replace(/[\s-]/g, '');

  // Cédula profesional mexicana: 7-8 dígitos
  const cedulaRegex = /^\d{7,8}$/;

  return cedulaRegex.test(cleaned);
}

/**
 * Normaliza el número de cédula (elimina espacios y guiones)
 */
export function normalizeLicense(license: string): string {
  return license.replace(/[\s-]/g, '');
}

/**
 * Valida las credenciales de un profesional de salud
 *
 * @param role - Rol del profesional (DOCTOR, NURSE, PARAMEDIC, etc.)
 * @param license - Número de cédula profesional (opcional)
 * @param institutionName - Nombre de la institución (opcional)
 * @returns Resultado de la validación
 */
export function validateProfessionalCredentials(
  role: string,
  license?: string,
  institutionName?: string
): CredentialValidationResult {
  const result: CredentialValidationResult = {
    isValid: true,
    isVerified: false,
    requiresLicense: ROLES_REQUIRING_LICENSE.includes(role),
    licenseRecommended: ROLES_LICENSE_RECOMMENDED.includes(role),
    warnings: [],
    errors: [],
  };

  // Verificar si el rol requiere cédula
  if (result.requiresLicense) {
    if (!license) {
      result.errors.push(`El rol ${role} requiere cédula profesional`);
      result.isValid = false;
    } else if (!validateLicenseFormat(license)) {
      result.errors.push('Formato de cédula profesional inválido (debe ser 7-8 dígitos)');
      result.isValid = false;
    } else {
      // Formato válido - para verificación real usar verifyProfessionalCredentialsAsync
      result.isVerified = false;
      result.warnings.push('Use verifyProfessionalCredentialsAsync para verificación completa con SEP');
    }
  }

  // Si el rol recomienda cédula pero no la proporcionó
  if (result.licenseRecommended && !license) {
    result.warnings.push(`Se recomienda proporcionar cédula profesional para el rol ${role}`);
  }

  // Si proporcionó cédula, validar formato
  if (license && !result.requiresLicense) {
    if (validateLicenseFormat(license)) {
      result.isVerified = false; // Formato válido pero no verificado
    } else {
      result.warnings.push('Formato de cédula profesional inválido');
    }
  }

  // Verificar institución
  if (!institutionName) {
    result.warnings.push('No se proporcionó nombre de institución');
  }

  return result;
}

/**
 * Determina el nivel de confianza del acceso basado en las credenciales
 *
 * @returns 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'
 */
export function getAccessTrustLevel(
  role: string,
  license?: string,
  institutionName?: string
): 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED' {
  const hasValidLicense = license && validateLicenseFormat(license);
  const hasInstitution = !!institutionName;

  if (ROLES_REQUIRING_LICENSE.includes(role)) {
    if (hasValidLicense && hasInstitution) {
      return 'HIGH';
    } else if (hasValidLicense) {
      return 'MEDIUM';
    } else {
      return 'UNVERIFIED';
    }
  }

  if (ROLES_LICENSE_RECOMMENDED.includes(role)) {
    if (hasValidLicense && hasInstitution) {
      return 'HIGH';
    } else if (hasInstitution) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  // Roles sin requisito
  return hasInstitution ? 'LOW' : 'UNVERIFIED';
}

/**
 * Genera mensaje de alerta para representantes según nivel de confianza
 */
export function getAlertMessageForTrustLevel(
  trustLevel: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED',
  accessorName: string,
  role: string
): string {
  switch (trustLevel) {
    case 'VERIFIED':
      return `✅ Acceso de emergencia por ${accessorName} (${role}) - Cédula VERIFICADA con SEP`;
    case 'HIGH':
      return `Acceso de emergencia por ${accessorName} (${role}) - Credenciales verificadas`;
    case 'MEDIUM':
      return `Acceso de emergencia por ${accessorName} (${role}) - Credenciales parcialmente verificadas`;
    case 'LOW':
      return `⚠️ Acceso de emergencia por ${accessorName} (${role}) - Sin cédula profesional`;
    case 'UNVERIFIED':
      return `🚨 ALERTA: Acceso de emergencia por ${accessorName} (${role}) - SIN CREDENCIALES VERIFICABLES`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICACIÓN ASYNC CON API SEP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resultado extendido de validación con verificación SEP
 */
export interface CredentialVerificationResultAsync extends CredentialValidationResult {
  sepVerification?: {
    found: boolean;
    professionalName?: string;
    title?: string;
    institution?: string;
    yearRegistered?: number;
    isHealthProfessional?: boolean;
    nameMatches?: boolean;
  };
}

/**
 * Verifica credenciales profesionales con consulta a la API de la SEP
 *
 * @param role - Rol del profesional (DOCTOR, NURSE, PARAMEDIC, etc.)
 * @param license - Número de cédula profesional
 * @param professionalName - Nombre del profesional (para verificar coincidencia)
 * @param institutionName - Nombre de la institución
 * @returns Resultado de la verificación incluyendo datos de SEP
 */
export async function verifyProfessionalCredentialsAsync(
  role: string,
  license?: string,
  professionalName?: string,
  institutionName?: string
): Promise<CredentialVerificationResultAsync> {
  // Primero hacer validación básica
  const basicResult = validateProfessionalCredentials(role, license, institutionName);

  const result: CredentialVerificationResultAsync = {
    ...basicResult,
    warnings: basicResult.warnings.filter(w => !w.includes('verifyProfessionalCredentialsAsync')),
  };

  // Si no hay cédula o formato inválido, retornar resultado básico
  if (!license || !validateLicenseFormat(license)) {
    return result;
  }

  // Verificar con API SEP
  try {
    const sepResult = await cedulaSEPService.verifyHealthProfessional(license, professionalName);

    result.sepVerification = {
      found: sepResult.details !== undefined,
      professionalName: sepResult.details
        ? `${sepResult.details.nombre} ${sepResult.details.paterno} ${sepResult.details.materno}`
        : undefined,
      title: sepResult.specialty,
      institution: sepResult.details?.institucion,
      yearRegistered: sepResult.details?.anioRegistro,
      isHealthProfessional: sepResult.isHealthProfessional,
      nameMatches: sepResult.matchesName,
    };

    if (sepResult.details) {
      result.isVerified = true;
      // Quitar warnings de "no verificado"
      result.warnings = result.warnings.filter(w =>
        !w.includes('no verificada') && !w.includes('SEP')
      );

      // Verificar si es profesional de salud
      if (!sepResult.isHealthProfessional) {
        result.warnings.push(
          `La cédula corresponde a "${sepResult.specialty}", no es profesional de salud`
        );
      }

      // Verificar coincidencia de nombre
      if (professionalName && !sepResult.matchesName) {
        result.warnings.push(
          `El nombre registrado (${result.sepVerification.professionalName}) no coincide con el proporcionado`
        );
      }
    } else {
      result.isVerified = true; // Verificamos pero no encontramos
      result.isValid = false;
      result.errors.push('Cédula no encontrada en el registro oficial de la SEP');
    }
  } catch (error) {
    // Error de conexión - mantener como no verificado pero válido en formato
    result.warnings.push('No se pudo verificar la cédula con la SEP (error de conexión)');
  }

  return result;
}

/**
 * Determina el nivel de confianza con verificación SEP
 */
export async function getAccessTrustLevelAsync(
  role: string,
  license?: string,
  professionalName?: string,
  institutionName?: string
): Promise<'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'> {
  if (!license) {
    return ROLES_REQUIRING_LICENSE.includes(role) ? 'UNVERIFIED' : 'LOW';
  }

  const verification = await verifyProfessionalCredentialsAsync(
    role,
    license,
    professionalName,
    institutionName
  );

  if (verification.isVerified && verification.sepVerification?.found) {
    if (verification.sepVerification.isHealthProfessional && verification.sepVerification.nameMatches !== false) {
      return 'VERIFIED'; // Máximo nivel: cédula verificada, es profesional de salud
    }
    return 'HIGH'; // Cédula verificada pero con advertencias
  }

  if (verification.isValid && validateLicenseFormat(license)) {
    return institutionName ? 'MEDIUM' : 'LOW';
  }

  return 'UNVERIFIED';
}
