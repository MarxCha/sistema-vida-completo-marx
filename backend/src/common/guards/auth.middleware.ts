// src/common/guards/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { authService, AuthError } from '../../modules/auth/auth.service';

// Extender el tipo Request para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Middleware de autenticación
 * Verifica el token JWT y añade userId al request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Token de autorización no proporcionado' },
      });
    }
    
    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN_FORMAT', message: 'Formato de token inválido' },
      });
    }
    
    const token = parts[1];
    const payload = authService.verifyAccessToken(token);
    
    req.userId = payload.userId;
    req.userEmail = payload.email;
    
    next();
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No autorizado' },
    });
  }
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero si hay uno válido, añade userId
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }
    
    const token = parts[1];
    const payload = authService.verifyAccessToken(token);
    
    req.userId = payload.userId;
    req.userEmail = payload.email;
    
    next();
  } catch (error) {
    // En caso de error, simplemente continuar sin autenticación
    next();
  }
};
