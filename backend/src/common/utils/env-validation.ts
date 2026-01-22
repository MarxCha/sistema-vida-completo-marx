/**
 * Validación de variables de entorno críticas
 *
 * Este módulo previene que la aplicación inicie con configuración insegura.
 * Debe ejecutarse ANTES de cargar cualquier otro módulo que dependa de secrets.
 */

import dotenv from 'dotenv';

// Cargar .env antes de validar
dotenv.config();

interface ValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * Valida que las variables de entorno críticas estén configuradas correctamente.
 * Termina el proceso con código 1 si hay errores críticos.
 */
export function validateEnvironment(): void {
  const result = performValidation();

  if (result.errors.length > 0) {
    console.error('\n❌ ERRORES DE CONFIGURACIÓN:');
    result.errors.forEach(e => console.error(`   - ${e}`));
    console.error('\n💡 Soluciones:');
    console.error('   - JWT_SECRET: Genera uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('   - ENCRYPTION_KEY: Genera uno con: openssl rand -hex 32');
    console.error('\nLa aplicación no puede iniciar con configuración insegura.\n');
    process.exit(1);
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️  ADVERTENCIAS DE CONFIGURACIÓN:');
    result.warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('');
  }
}

function performValidation(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = process.env.NODE_ENV || 'development';
  const isProduction = env === 'production';

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES CRÍTICAS - Siempre requeridas
  // ═══════════════════════════════════════════════════════════════════════════

  // JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET es requerido');
  } else {
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.includes('your-super-secret') ||
        jwtSecret.includes('change-in-production') ||
        jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
      errors.push('JWT_SECRET contiene valor placeholder - debe generar uno seguro');
    } else if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET debe tener mínimo 32 caracteres');
    }
  }

  // ENCRYPTION_KEY
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY es requerido');
  } else {
    const encKey = process.env.ENCRYPTION_KEY;
    // Detectar valor por defecto exacto
    if (encKey === '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef') {
      errors.push('ENCRYPTION_KEY contiene el valor por defecto - debe generar uno seguro');
    } else if (!/^[0-9a-f]{64}$/i.test(encKey)) {
      errors.push('ENCRYPTION_KEY debe ser exactamente 64 caracteres hexadecimales (256 bits)');
    }
  }

  // DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL es requerido');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES DE PRODUCCIÓN - Solo en producción
  // ═══════════════════════════════════════════════════════════════════════════

  if (isProduction) {
    // JWT_ADMIN_SECRET separado en producción
    if (!process.env.JWT_ADMIN_SECRET) {
      errors.push('JWT_ADMIN_SECRET es requerido en producción');
    } else if (process.env.JWT_ADMIN_SECRET === process.env.JWT_SECRET) {
      warnings.push('JWT_ADMIN_SECRET debería ser diferente de JWT_SECRET en producción');
    }

    // Stripe completo en producción
    if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET es requerido cuando Stripe está configurado en producción');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADVERTENCIAS - Servicios opcionales
  // ═══════════════════════════════════════════════════════════════════════════

  // Twilio (notificaciones SMS/WhatsApp)
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    warnings.push('Twilio no configurado - notificaciones SMS/WhatsApp deshabilitadas');
  }

  // Resend (email)
  if (!process.env.RESEND_API_KEY) {
    warnings.push('Resend no configurado - notificaciones por email deshabilitadas');
  }

  // AWS S3 (documentos)
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    warnings.push('AWS S3 no configurado - usando almacenamiento local para documentos');
  }

  // Stripe (pagos)
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('Stripe no configurado - pagos deshabilitados');
  } else if (!process.env.STRIPE_WEBHOOK_SECRET && !isProduction) {
    warnings.push('STRIPE_WEBHOOK_SECRET no configurado - webhooks de Stripe no funcionarán');
  }

  return { errors, warnings };
}

/**
 * Genera comandos para crear secrets seguros
 */
export function printSecretGenerationHelp(): void {
  console.log('\n🔐 Generación de secrets seguros:\n');
  console.log('JWT_SECRET:');
  console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('\nENCRYPTION_KEY (AES-256):');
  console.log('  openssl rand -hex 32');
  console.log('\nJWT_ADMIN_SECRET:');
  console.log('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('');
}

export default validateEnvironment;
