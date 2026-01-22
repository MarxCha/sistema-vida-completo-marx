// src/modules/admin/admin-auth.controller.ts
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { adminAuthService } from './admin-auth.service';
import { adminMFAService } from './admin-mfa.service';
import { adminAuthMiddleware } from '../../common/guards/admin-auth.middleware';
import { requireSuperAdmin } from '../../common/guards/admin-roles.guard';
import { securityMetrics } from '../../common/services/security-metrics.service';
import { logger } from '../../common/services/logger.service';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITERS PARA ADMIN AUTH (más estrictos que auth normal)
// ═══════════════════════════════════════════════════════════════════════════

// Rate limiter para login de admin: 3 intentos por minuto
const adminLoginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 3, // Más estricto para admins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'ADMIN_LOGIN_RATE_LIMIT',
      message: 'Demasiados intentos de inicio de sesión. Espere un momento.',
    },
  },
  handler: (req, res, _next, options) => {
    const ip = req.ip || 'unknown';
    securityMetrics.recordRateLimitHit(ip, '/admin/auth/login');
    logger.security('Admin login rate limit hit', { ip, path: '/admin/auth/login' });
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => req.ip || 'unknown',
});

// Rate limiter para MFA: 5 intentos por 5 minutos
const mfaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5,
  message: {
    success: false,
    error: {
      code: 'MFA_RATE_LIMIT',
      message: 'Demasiados intentos de verificación MFA. Espere unos minutos.',
    },
  },
  handler: (req, res, _next, options) => {
    const ip = req.ip || 'unknown';
    securityMetrics.recordRateLimitHit(ip, '/admin/auth/login/mfa');
    logger.security('MFA rate limit hit', { ip, path: '/admin/auth/login/mfa' });
    res.status(429).json(options.message);
  },
});

// Cache temporal para tokens MFA pendientes (en producción usar Redis)
const pendingMFATokens = new Map<string, {
  adminId: string;
  email: string;
  expiresAt: Date;
}>();

// Limpiar tokens expirados cada minuto
setInterval(() => {
  const now = new Date();
  for (const [token, data] of pendingMFATokens.entries()) {
    if (data.expiresAt < now) {
      pendingMFATokens.delete(token);
    }
  }
}, 60 * 1000);

/**
 * POST /api/v1/admin/auth/login
 * Inicia sesion de administrador
 *
 * Flujo con MFA:
 * 1. Usuario envía email/password
 * 2. Si MFA está habilitado, retorna mfaRequired: true y mfaToken temporal
 * 3. Usuario envía mfaToken + code a /login/mfa
 * 4. Si es válido, retorna tokens de acceso
 */
router.post('/login', adminLoginLimiter, async (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  const { email } = req.body;

  try {
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email y contrasena son requeridos',
        },
      });
    }

    const userAgent = req.headers['user-agent'];

    // Paso 1: Verificar credenciales
    const result = await adminAuthService.login(email, password, ip, userAgent);

    // Paso 2: Verificar si MFA está habilitado
    const mfaStatus = await adminMFAService.getMFAStatus(result.admin.id);

    if (mfaStatus.enabled) {
      // MFA habilitado - generar token temporal y requerir código
      const crypto = await import('crypto');
      const mfaToken = crypto.randomBytes(32).toString('hex');

      // Guardar token temporal (expira en 5 minutos)
      pendingMFATokens.set(mfaToken, {
        adminId: result.admin.id,
        email: result.admin.email,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      logger.info('MFA verificación requerida para admin', { email: result.admin.email });

      return res.json({
        success: true,
        mfaRequired: true,
        mfaToken,
        message: 'Se requiere código de autenticación de dos factores',
      });
    }

    // Sin MFA - registrar login exitoso y retornar tokens
    securityMetrics.recordSuccessfulLogin(ip, `admin:${result.admin.id}`);
    logger.info('Admin login exitoso', { adminId: result.admin.id, email, ip });

    res.json({
      success: true,
      mfaRequired: false,
      data: result,
    });
  } catch (error: any) {
    // Registrar intento fallido
    securityMetrics.recordFailedLogin(ip, email, error.code || 'ADMIN_LOGIN_ERROR');
    logger.warn('Admin login fallido', { ip, email, reason: error.code || error.message });

    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'LOGIN_ERROR',
        message: error.message || 'Error al iniciar sesion',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/login/mfa
 * Completa el login con código MFA
 */
router.post('/login/mfa', mfaLimiter, async (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';

  try {
    const { mfaToken, code } = req.body;

    if (!mfaToken || !code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'mfaToken y code son requeridos',
        },
      });
    }

    // Verificar token temporal
    const pendingMFA = pendingMFATokens.get(mfaToken);

    if (!pendingMFA) {
      securityMetrics.recordMFAFailure(ip, 'unknown');
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_MFA_TOKEN',
          message: 'Token MFA inválido o expirado. Inicie sesión nuevamente.',
        },
      });
    }

    if (pendingMFA.expiresAt < new Date()) {
      pendingMFATokens.delete(mfaToken);
      securityMetrics.recordMFAFailure(ip, pendingMFA.adminId);
      return res.status(401).json({
        success: false,
        error: {
          code: 'MFA_TOKEN_EXPIRED',
          message: 'Token MFA expirado. Inicie sesión nuevamente.',
        },
      });
    }

    // Verificar código MFA
    await adminMFAService.verifyMFACode(pendingMFA.adminId, code);

    // Eliminar token temporal usado
    pendingMFATokens.delete(mfaToken);

    // Obtener datos del admin y generar tokens
    const adminData = await adminAuthService.getMe(pendingMFA.adminId);

    // Generar nuevos tokens (usando método interno del servicio)
    const jwtLib = await import('jsonwebtoken');
    const config = (await import('../../config')).default;

    const adminSecret = config.jwt.adminSecret || config.jwt.secret;

    const tokenPayload = {
      adminId: adminData.id,
      email: adminData.email,
      role: adminData.role,
      permissions: adminData.permissions,
      isSuperAdmin: adminData.isSuperAdmin,
      type: 'admin_access',
    };

    const accessToken = jwtLib.sign(tokenPayload, adminSecret, {
      expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwtLib.sign(
      { ...tokenPayload, type: 'admin_refresh' },
      adminSecret,
      { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    // Registrar login exitoso con MFA
    securityMetrics.recordSuccessfulLogin(ip, `admin:${pendingMFA.adminId}`);
    logger.info('Admin MFA login exitoso', { adminId: pendingMFA.adminId, email: pendingMFA.email, ip });

    res.json({
      success: true,
      data: {
        admin: adminData,
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    // Registrar fallo de MFA
    const pendingMFA = pendingMFATokens.get(req.body?.mfaToken);
    if (pendingMFA) {
      securityMetrics.recordMFAFailure(ip, pendingMFA.adminId);
    }
    logger.warn('Admin MFA verification failed', { ip, error: error.message });

    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'MFA_ERROR',
        message: error.message || 'Error en verificación MFA',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/logout
 * Cierra sesion de administrador
 */
router.post('/logout', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token requerido',
        },
      });
    }

    await adminAuthService.logout(refreshToken, req.adminId!);

    res.json({
      success: true,
      message: 'Sesion cerrada correctamente',
    });
  } catch (error: any) {
    logger.error('Admin logout error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'LOGOUT_ERROR',
        message: error.message || 'Error al cerrar sesion',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/refresh
 * Renueva tokens de acceso
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Refresh token requerido',
        },
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await adminAuthService.refreshTokens(refreshToken, ipAddress, userAgent);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Admin refresh error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'REFRESH_ERROR',
        message: error.message || 'Error al renovar tokens',
      },
    });
  }
});

/**
 * GET /api/v1/admin/auth/me
 * Obtiene informacion del admin actual
 */
router.get('/me', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const admin = await adminAuthService.getMe(req.adminId!);

    res.json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    logger.error('Admin get me error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al obtener datos',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/change-password
 * Cambia la contrasena del admin
 */
router.post('/change-password', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Contrasena actual y nueva son requeridas',
        },
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;

    await adminAuthService.changePassword(req.adminId!, currentPassword, newPassword, ipAddress);

    res.json({
      success: true,
      message: 'Contrasena cambiada correctamente. Inicie sesion nuevamente.',
    });
  } catch (error: any) {
    logger.error('Admin change password error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al cambiar contrasena',
      },
    });
  }
});

// ==================== MFA (Autenticación Multi-Factor) ====================

/**
 * GET /api/v1/admin/auth/mfa/status
 * Obtiene el estado de MFA del admin actual
 */
router.get('/mfa/status', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await adminMFAService.getMFAStatus(req.adminId!);

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('MFA status error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al obtener estado de MFA',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/mfa/setup
 * Inicia la configuración de MFA (genera QR code)
 */
router.post('/mfa/setup', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await adminMFAService.setupMFA(req.adminId!);

    res.json({
      success: true,
      data: {
        qrCodeDataUrl: result.qrCodeDataUrl,
        manualEntryKey: result.manualEntryKey,
        backupCodes: result.backupCodes,
      },
      message: 'Escanee el código QR con su aplicación de autenticación y verifique con un código',
    });
  } catch (error: any) {
    logger.error('MFA setup error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al configurar MFA',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/mfa/verify
 * Verifica el código TOTP y activa MFA
 */
router.post('/mfa/verify', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Código de verificación requerido',
        },
      });
    }

    await adminMFAService.verifyAndEnableMFA(req.adminId!, code);

    res.json({
      success: true,
      message: 'MFA activado correctamente. A partir de ahora se requerirá código al iniciar sesión.',
    });
  } catch (error: any) {
    logger.error('MFA verify error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al verificar MFA',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/mfa/disable
 * Deshabilita MFA (requiere código actual)
 */
router.post('/mfa/disable', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Código de verificación requerido para deshabilitar MFA',
        },
      });
    }

    await adminMFAService.disableMFA(req.adminId!, code);

    res.json({
      success: true,
      message: 'MFA deshabilitado correctamente.',
    });
  } catch (error: any) {
    logger.error('MFA disable error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al deshabilitar MFA',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/mfa/backup-codes
 * Regenera códigos de respaldo (requiere código actual)
 */
router.post('/mfa/backup-codes', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Código de verificación requerido para regenerar códigos de respaldo',
        },
      });
    }

    const backupCodes = await adminMFAService.regenerateBackupCodes(req.adminId!, code);

    res.json({
      success: true,
      data: { backupCodes },
      message: 'Nuevos códigos de respaldo generados. Guárdelos en un lugar seguro.',
    });
  } catch (error: any) {
    logger.error('MFA backup codes error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al regenerar códigos de respaldo',
      },
    });
  }
});

// ==================== GESTION DE ADMINS (Solo Super Admin) ====================

/**
 * GET /api/v1/admin/auth/admins
 * Lista todos los administradores
 */
router.get('/admins', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await adminAuthService.listAdmins(req.adminId!);

    res.json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    logger.error('Admin list error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al listar administradores',
      },
    });
  }
});

/**
 * POST /api/v1/admin/auth/admins
 * Crea un nuevo administrador
 */
router.post('/admins', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, permissions, isSuperAdmin } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email, password, name y role son requeridos',
        },
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;

    const admin = await adminAuthService.createAdmin(
      req.adminId!,
      { email, password, name, role, permissions, isSuperAdmin },
      ipAddress
    );

    res.status(201).json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    logger.error('Admin create error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al crear administrador',
      },
    });
  }
});

/**
 * PUT /api/v1/admin/auth/admins/:id
 * Actualiza un administrador
 */
router.put('/admins/:id', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, permissions, isActive } = req.body;

    const ipAddress = req.ip || req.connection.remoteAddress;

    const admin = await adminAuthService.updateAdmin(
      req.adminId!,
      id,
      { name, role, permissions, isActive },
      ipAddress
    );

    res.json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    logger.error('Admin update error', error);
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'ERROR',
        message: error.message || 'Error al actualizar administrador',
      },
    });
  }
});

export default router;
