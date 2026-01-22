// src/common/config/security.config.ts
/**
 * Configuración y Documentación de Seguridad
 * Sistema VIDA - Vinculación de Información para Decisiones y Alertas
 *
 * Este archivo centraliza la configuración de seguridad y sirve como
 * documentación para desarrolladores y auditores.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE AUTENTICACIÓN
// ═══════════════════════════════════════════════════════════════════════════

export const AUTH_ENDPOINTS = {
  // Autenticación de usuarios
  USER: {
    LOGIN: {
      path: '/api/v1/auth/login',
      method: 'POST',
      rateLimit: '10 requests / 15 min',
      description: 'Iniciar sesión de usuario',
      body: {
        email: 'string (required)',
        password: 'string (required)',
      },
      responses: {
        200: 'Login exitoso - retorna tokens',
        401: 'Credenciales inválidas',
        429: 'Rate limit excedido',
      },
      security: ['Rate limiting', 'Password hashing (bcrypt)'],
    },
    REGISTER: {
      path: '/api/v1/auth/register',
      method: 'POST',
      rateLimit: '10 requests / 15 min',
      description: 'Registrar nuevo usuario',
      body: {
        email: 'string (required)',
        password: 'string (required, min 8 chars, uppercase, lowercase, number)',
        curp: 'string (required, formato CURP mexicano)',
        name: 'string (required)',
        phone: 'string (optional)',
      },
      responses: {
        201: 'Usuario creado',
        400: 'Datos inválidos o CURP/email duplicado',
        429: 'Rate limit excedido',
      },
      security: ['Password strength validation', 'CURP format validation'],
    },
    REFRESH: {
      path: '/api/v1/auth/refresh',
      method: 'POST',
      description: 'Refrescar access token',
      body: {
        refreshToken: 'string (required)',
      },
      responses: {
        200: 'Nuevos tokens generados',
        401: 'Token inválido o expirado',
      },
      security: ['Token rotation on refresh'],
    },
    LOGOUT: {
      path: '/api/v1/auth/logout',
      method: 'POST',
      auth: 'Bearer token',
      description: 'Cerrar sesión actual',
    },
    LOGOUT_ALL: {
      path: '/api/v1/auth/logout-all',
      method: 'POST',
      auth: 'Bearer token',
      description: 'Cerrar todas las sesiones del usuario',
    },
  },

  // Autenticación de administradores
  ADMIN: {
    LOGIN: {
      path: '/api/v1/admin/auth/login',
      method: 'POST',
      rateLimit: '10 requests / 15 min',
      description: 'Iniciar sesión de administrador (paso 1)',
      body: {
        email: 'string (required)',
        password: 'string (required)',
      },
      responses: {
        200: 'Login exitoso - retorna tokens (si MFA deshabilitado)',
        202: 'MFA requerido - retorna mfaToken temporal',
        401: 'Credenciales inválidas',
      },
      security: ['Rate limiting', 'Separate JWT secret for admins'],
    },
    LOGIN_MFA: {
      path: '/api/v1/admin/auth/login/mfa',
      method: 'POST',
      description: 'Completar login con código MFA (paso 2)',
      body: {
        mfaToken: 'string (required, del paso 1)',
        code: 'string (required, 6 dígitos TOTP o código backup)',
      },
      responses: {
        200: 'Login exitoso - retorna tokens',
        401: 'Código MFA inválido',
        410: 'Token MFA expirado (5 min)',
      },
      security: ['TOTP verification', 'Backup codes support'],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS MFA (ADMINISTRADORES)
// ═══════════════════════════════════════════════════════════════════════════

export const MFA_ENDPOINTS = {
  STATUS: {
    path: '/api/v1/admin/auth/mfa/status',
    method: 'GET',
    auth: 'Admin Bearer token',
    description: 'Obtener estado de MFA del administrador',
    responses: {
      200: '{ enabled: boolean, backupCodesRemaining?: number }',
    },
  },
  SETUP: {
    path: '/api/v1/admin/auth/mfa/setup',
    method: 'POST',
    auth: 'Admin Bearer token',
    description: 'Iniciar configuración de MFA',
    responses: {
      200: '{ qrCodeDataUrl, manualEntryKey, backupCodes[] }',
    },
    security: ['QR code for authenticator apps', '10 backup codes generated'],
  },
  VERIFY: {
    path: '/api/v1/admin/auth/mfa/verify',
    method: 'POST',
    auth: 'Admin Bearer token',
    description: 'Verificar y activar MFA',
    body: {
      code: 'string (6 dígitos del authenticator)',
    },
    responses: {
      200: 'MFA activado exitosamente',
      400: 'Código inválido',
    },
  },
  DISABLE: {
    path: '/api/v1/admin/auth/mfa/disable',
    method: 'POST',
    auth: 'Admin Bearer token',
    description: 'Deshabilitar MFA',
    body: {
      code: 'string (código actual para confirmar)',
    },
  },
  REGENERATE_BACKUP: {
    path: '/api/v1/admin/auth/mfa/backup-codes',
    method: 'POST',
    auth: 'Admin Bearer token',
    description: 'Regenerar códigos de respaldo',
    body: {
      code: 'string (código actual para confirmar)',
    },
    responses: {
      200: '{ backupCodes[] } - Nuevos 10 códigos',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE TOKENS JWT
// ═══════════════════════════════════════════════════════════════════════════

export const JWT_CONFIG = {
  ACCESS_TOKEN: {
    expiration: '15 minutos',
    payload: ['userId', 'email', 'type'],
    storage: 'Memory only (no localStorage)',
  },
  REFRESH_TOKEN: {
    expiration: '7 días',
    storage: 'HttpOnly cookie (producción) o secure storage',
    rotation: 'New token on each refresh',
  },
  ADMIN_TOKENS: {
    note: 'Usan secret separado (JWT_ADMIN_SECRET)',
    additionalPayload: ['permissions', 'isSuperAdmin'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE SESIONES
// ═══════════════════════════════════════════════════════════════════════════

export const SESSION_CONFIG = {
  MAX_SESSIONS_PER_USER: 5,
  SESSION_EXPIRY: '7 días',
  CLEANUP: 'Sesiones antiguas eliminadas automáticamente al crear nueva',
  TRACKING: ['IP address', 'User agent', 'Created at', 'Expires at'],
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CONTRASEÑAS
// ═══════════════════════════════════════════════════════════════════════════

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
  REQUIREMENTS: {
    uppercase: true,
    lowercase: true,
    number: true,
    special: false, // Opcional para mejor UX
  },
  BLOCKED_PATTERNS: [
    '123456...',
    'password',
    'qwerty',
    'abc123',
    '4+ caracteres repetidos',
  ],
  HASHING: 'bcrypt con 12 rounds',
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

export const RATE_LIMIT_CONFIG = {
  GLOBAL: {
    window: '1 minuto',
    maxRequests: 100,
  },
  AUTH: {
    window: '15 minutos',
    maxRequests: 10,
    appliesTo: ['/api/v1/auth/*', '/api/v1/admin/auth/*'],
  },
  EMERGENCY: {
    window: '1 minuto',
    maxRequests: 10,
    appliesTo: ['/api/v1/emergency/access/*'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HEADERS DE SEGURIDAD
// ═══════════════════════════════════════════════════════════════════════════

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload (solo producción)',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cache-Control': 'no-store (para API endpoints)',
};

// ═══════════════════════════════════════════════════════════════════════════
// PROTECCIÓN CSRF
// ═══════════════════════════════════════════════════════════════════════════

export const CSRF_CONFIG = {
  METHOD: 'Origin/Referer validation',
  PROTECTED_METHODS: ['POST', 'PUT', 'PATCH', 'DELETE'],
  EXEMPT_PATHS: [
    '/api/v1/webhooks/*', // Tienen su propia autenticación
    '/api/v1/emergency/access', // Público por diseño
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
  ],
  NOTE: 'APIs con JWT en Authorization header tienen menor riesgo CSRF',
};

// ═══════════════════════════════════════════════════════════════════════════
// CIFRADO DE DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENT_ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-256-GCM',
  KEY_DERIVATION: 'HKDF con salt único por documento',
  AT_REST: 'Todos los documentos médicos cifrados antes de almacenar',
  COMPLIANCE: ['HIPAA', 'NOM-024-SSA3-2012', 'GDPR Art. 32'],
};

// ═══════════════════════════════════════════════════════════════════════════
// RETENCIÓN DE LOGS
// ═══════════════════════════════════════════════════════════════════════════

export const LOG_RETENTION_CONFIG = {
  ADMIN_AUDIT: {
    active: '2 años',
    archive: '3 años adicionales',
    total: '5 años',
  },
  EMERGENCY_ACCESS: {
    active: '5 años',
    archive: '5 años adicionales',
    note: 'Requiere revisión manual para eliminación',
  },
  SESSIONS: {
    expiredCleanup: '90 días',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// VARIABLES DE ENTORNO REQUERIDAS
// ═══════════════════════════════════════════════════════════════════════════

export const REQUIRED_ENV_VARS = {
  CRITICAL: {
    JWT_SECRET: 'Mínimo 32 caracteres, sin valores default',
    ENCRYPTION_KEY: '64 caracteres hexadecimales (32 bytes)',
    DATABASE_URL: 'URL de conexión PostgreSQL',
  },
  PRODUCTION_REQUIRED: {
    JWT_ADMIN_SECRET: 'Secret separado para tokens de admin',
    CORS_ORIGINS: 'Lista de orígenes permitidos',
  },
  OPTIONAL: {
    STRIPE_SECRET_KEY: 'Para pagos',
    STRIPE_WEBHOOK_SECRET: 'Para verificar webhooks de Stripe',
    'TWILIO_*': 'Para SMS de emergencia (TWILIO_SID, TWILIO_TOKEN, etc.)',
  },
};

export default {
  AUTH_ENDPOINTS,
  MFA_ENDPOINTS,
  JWT_CONFIG,
  SESSION_CONFIG,
  PASSWORD_CONFIG,
  RATE_LIMIT_CONFIG,
  SECURITY_HEADERS,
  CSRF_CONFIG,
  DOCUMENT_ENCRYPTION_CONFIG,
  LOG_RETENTION_CONFIG,
  REQUIRED_ENV_VARS,
};
