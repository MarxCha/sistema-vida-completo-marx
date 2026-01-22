// src/common/guards/premium.middleware.ts
import { logger } from '../services/logger.service';
import { Request, Response, NextFunction } from 'express';
import { premiumFeaturesService, FeatureKey, LimitKey } from '../../modules/payments/services/premium-features.service';

/**
 * Middleware para verificar acceso a una feature premium
 *
 * @param featureKey - La clave de la feature a verificar
 * @returns Middleware de Express
 *
 * @example
 * // En el controller
 * router.post('/directives/draft',
 *   authMiddleware,
 *   requirePremiumFeature('advanceDirectives'),
 *   createDirectiveHandler
 * );
 */
export const requirePremiumFeature = (featureKey: FeatureKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED',
        });
      }

      const hasAccess = await premiumFeaturesService.hasFeature(userId, featureKey);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Esta función requiere una suscripción Premium',
          code: 'PREMIUM_REQUIRED',
          data: {
            feature: featureKey,
            upgradeUrl: '/subscription/plans',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error verificando feature premium:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando acceso premium',
      });
    }
  };
};

/**
 * Middleware para verificar múltiples features premium (todas requeridas)
 *
 * @param featureKeys - Array de claves de features a verificar
 * @returns Middleware de Express
 */
export const requireAllPremiumFeatures = (featureKeys: FeatureKey[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED',
        });
      }

      const hasAllAccess = await premiumFeaturesService.hasAllFeatures(userId, featureKeys);

      if (!hasAllAccess) {
        return res.status(403).json({
          success: false,
          error: 'Esta función requiere una suscripción Premium',
          code: 'PREMIUM_REQUIRED',
          data: {
            features: featureKeys,
            upgradeUrl: '/subscription/plans',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error verificando features premium:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando acceso premium',
      });
    }
  };
};

/**
 * Middleware para verificar al menos una feature premium
 *
 * @param featureKeys - Array de claves de features (al menos una requerida)
 * @returns Middleware de Express
 */
export const requireAnyPremiumFeature = (featureKeys: FeatureKey[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED',
        });
      }

      const hasAnyAccess = await premiumFeaturesService.hasAnyFeature(userId, featureKeys);

      if (!hasAnyAccess) {
        return res.status(403).json({
          success: false,
          error: 'Esta función requiere una suscripción Premium',
          code: 'PREMIUM_REQUIRED',
          data: {
            features: featureKeys,
            upgradeUrl: '/subscription/plans',
          },
        });
      }

      next();
    } catch (error) {
      logger.error('Error verificando features premium:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando acceso premium',
      });
    }
  };
};

/**
 * Middleware para verificar límite de recursos
 *
 * @param limitKey - La clave del límite a verificar
 * @param getCurrentCount - Función que retorna el conteo actual del recurso
 * @returns Middleware de Express
 *
 * @example
 * // En el controller
 * router.post('/representatives',
 *   authMiddleware,
 *   checkResourceLimit('representativesLimit', async (userId) => {
 *     return await prisma.representative.count({ where: { userId } });
 *   }),
 *   createRepresentativeHandler
 * );
 */
export const checkResourceLimit = (
  limitKey: LimitKey,
  getCurrentCount: (userId: string) => Promise<number>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
          code: 'UNAUTHORIZED',
        });
      }

      const currentCount = await getCurrentCount(userId);
      const result = await premiumFeaturesService.canCreateResource(userId, limitKey, currentCount);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: `Has alcanzado el límite de ${result.limit} elementos. Actualiza a Premium para más.`,
          code: 'LIMIT_REACHED',
          data: {
            limit: result.limit,
            current: result.current,
            limitKey,
            upgradeUrl: '/subscription/plans',
          },
        });
      }

      // Agregar info del límite al request para uso posterior
      (req as Request & { resourceLimit: typeof result }).resourceLimit = result;

      next();
    } catch (error) {
      logger.error('Error verificando límite de recursos:', error);
      res.status(500).json({
        success: false,
        error: 'Error verificando límite',
      });
    }
  };
};

/**
 * Middleware para verificar si el usuario tiene suscripción Premium activa
 *
 * @returns Middleware de Express
 */
export const requirePremium = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        code: 'UNAUTHORIZED',
      });
    }

    const isPremium = await premiumFeaturesService.isPremium(userId);

    if (!isPremium) {
      return res.status(403).json({
        success: false,
        error: 'Esta función requiere una suscripción Premium activa',
        code: 'PREMIUM_REQUIRED',
        data: {
          upgradeUrl: '/subscription/plans',
        },
      });
    }

    next();
  } catch (error) {
    logger.error('Error verificando suscripción premium:', error);
    res.status(500).json({
      success: false,
      error: 'Error verificando acceso premium',
    });
  }
};

/**
 * Middleware opcional que agrega información premium al request sin bloquear
 * Útil para endpoints que funcionan diferente según el plan
 *
 * @returns Middleware de Express
 */
export const attachPremiumStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (userId) {
      const status = await premiumFeaturesService.getPremiumStatus(userId);
      (req as Request & { premiumStatus: typeof status }).premiumStatus = status;
    }

    next();
  } catch (error) {
    // No bloquear si hay error, solo continuar
    logger.error('Error obteniendo estado premium:', error);
    next();
  }
};
