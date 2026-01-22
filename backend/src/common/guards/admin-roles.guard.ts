// src/common/guards/admin-roles.guard.ts
import { Request, Response, NextFunction } from 'express';

type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'VIEWER' | 'SUPPORT';

/**
 * Guard para verificar roles de administrador
 * @param allowedRoles - Roles permitidos para acceder al recurso
 */
export const requireRoles = (...allowedRoles: AdminRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super admin siempre tiene acceso
    if (req.isSuperAdmin) {
      return next();
    }

    if (!req.adminRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Acceso denegado. Se requiere rol de administrador.',
        },
      });
    }

    if (!allowedRoles.includes(req.adminRole as AdminRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Rol insuficiente. Se requiere: ${allowedRoles.join(' o ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Guard para verificar permisos especificos
 * @param requiredPermission - Permiso requerido (e.g., 'users:write')
 */
export const requirePermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super admin siempre tiene acceso
    if (req.isSuperAdmin) {
      return next();
    }

    // Verificar si tiene el permiso wildcard
    if (req.adminPermissions?.includes('*')) {
      return next();
    }

    // Verificar permiso especifico
    if (!req.adminPermissions?.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MISSING_PERMISSION',
          message: `Permiso requerido: ${requiredPermission}`,
        },
      });
    }

    next();
  };
};

/**
 * Guard para verificar multiples permisos (todos requeridos)
 * @param requiredPermissions - Lista de permisos requeridos
 */
export const requireAllPermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super admin siempre tiene acceso
    if (req.isSuperAdmin) {
      return next();
    }

    // Verificar wildcard
    if (req.adminPermissions?.includes('*')) {
      return next();
    }

    const missingPermissions = requiredPermissions.filter(
      (p) => !req.adminPermissions?.includes(p)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MISSING_PERMISSIONS',
          message: `Permisos requeridos: ${missingPermissions.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Guard para verificar al menos uno de los permisos
 * @param anyPermissions - Lista de permisos (al menos uno requerido)
 */
export const requireAnyPermission = (...anyPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super admin siempre tiene acceso
    if (req.isSuperAdmin) {
      return next();
    }

    // Verificar wildcard
    if (req.adminPermissions?.includes('*')) {
      return next();
    }

    const hasAnyPermission = anyPermissions.some(
      (p) => req.adminPermissions?.includes(p)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'MISSING_PERMISSIONS',
          message: `Se requiere al menos uno de: ${anyPermissions.join(', ')}`,
        },
      });
    }

    next();
  };
};

/**
 * Guard para verificar que es super admin
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SUPER_ADMIN_REQUIRED',
        message: 'Esta accion requiere permisos de Super Administrador',
      },
    });
  }

  next();
};

// Permisos disponibles en el sistema
export const ADMIN_PERMISSIONS = {
  // Metricas
  METRICS_READ: 'metrics:read',

  // Usuarios
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',

  // Auditoria
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',

  // Instituciones
  INSTITUTIONS_READ: 'institutions:read',
  INSTITUTIONS_WRITE: 'institutions:write',

  // Salud del sistema
  HEALTH_READ: 'health:read',

  // Gestion de admins
  ADMINS_READ: 'admins:read',
  ADMINS_WRITE: 'admins:write',

  // Configuracion
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
} as const;

// Permisos por rol predeterminados
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    ADMIN_PERMISSIONS.METRICS_READ,
    ADMIN_PERMISSIONS.USERS_READ,
    ADMIN_PERMISSIONS.USERS_WRITE,
    ADMIN_PERMISSIONS.AUDIT_READ,
    ADMIN_PERMISSIONS.AUDIT_EXPORT,
    ADMIN_PERMISSIONS.INSTITUTIONS_READ,
    ADMIN_PERMISSIONS.INSTITUTIONS_WRITE,
    ADMIN_PERMISSIONS.HEALTH_READ,
  ],
  MODERATOR: [
    ADMIN_PERMISSIONS.METRICS_READ,
    ADMIN_PERMISSIONS.USERS_READ,
    ADMIN_PERMISSIONS.AUDIT_READ,
    ADMIN_PERMISSIONS.INSTITUTIONS_READ,
    ADMIN_PERMISSIONS.HEALTH_READ,
  ],
  VIEWER: [
    ADMIN_PERMISSIONS.METRICS_READ,
    ADMIN_PERMISSIONS.HEALTH_READ,
  ],
  SUPPORT: [
    ADMIN_PERMISSIONS.METRICS_READ,
    ADMIN_PERMISSIONS.USERS_READ,
    ADMIN_PERMISSIONS.AUDIT_READ,
    ADMIN_PERMISSIONS.HEALTH_READ,
  ],
};
