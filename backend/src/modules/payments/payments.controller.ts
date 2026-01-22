// src/modules/payments/payments.controller.ts
import { logger } from '../../common/services/logger.service';
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../common/guards/auth.middleware';
import { subscriptionService } from './services/subscription.service';
import { paymentService } from './services/payment.service';
import { invoiceService } from './services/invoice.service';
import { premiumFeaturesService } from './services/premium-features.service';
import config from '../../config';
import type {
  CreateCheckoutSessionInput,
  SavePaymentMethodInput,
  SaveFiscalDataInput,
  GenerateInvoiceInput,
} from './types/payments.types';
import { BillingCycle } from '@prisma/client';

const router = Router();

// ==================== PLANES ====================

/**
 * GET /api/v1/payments/plans
 * Lista todos los planes disponibles (público)
 */
router.get('/plans', async (_req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getPlans();

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Error obteniendo planes:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo planes',
    });
  }
});

// ==================== SUSCRIPCIÓN ====================

/**
 * GET /api/v1/payments/subscription
 * Obtiene la suscripción actual del usuario
 */
router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No tienes una suscripción activa',
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    logger.error('Error obteniendo suscripción:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo suscripción',
    });
  }
});

/**
 * GET /api/v1/payments/premium-status
 * Obtiene el estado premium completo del usuario
 */
router.get('/premium-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const status = await premiumFeaturesService.getPremiumStatus(userId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error obteniendo estado premium:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo estado premium',
    });
  }
});

/**
 * POST /api/v1/payments/subscription/upgrade
 * Inicia el proceso de upgrade a un plan premium
 */
router.post('/subscription/upgrade', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { planId, billingCycle } = req.body as { planId: string; billingCycle?: string };

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'planId es requerido',
      });
    }

    const input: CreateCheckoutSessionInput = {
      planId,
      billingCycle: (billingCycle as BillingCycle) || BillingCycle.MONTHLY,
      successUrl: `${config.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${config.frontendUrl}/subscription/plans`,
    };

    const result = await subscriptionService.createUpgradeCheckoutSession(userId, input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error iniciando upgrade:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error iniciando upgrade',
    });
  }
});

/**
 * POST /api/v1/payments/subscription/cancel
 * Cancela la suscripción del usuario
 */
router.post('/subscription/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { reason, immediately } = req.body as { reason?: string; immediately?: boolean };

    const subscription = await subscriptionService.cancelSubscription(
      userId,
      reason,
      immediately || false
    );

    // Invalidar cache
    premiumFeaturesService.invalidateCache(userId);

    res.json({
      success: true,
      data: subscription,
      message: immediately
        ? 'Suscripción cancelada'
        : 'Suscripción programada para cancelarse al final del período',
    });
  } catch (error) {
    logger.error('Error cancelando suscripción:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error cancelando suscripción',
    });
  }
});

/**
 * POST /api/v1/payments/subscription/reactivate
 * Reactiva una suscripción programada para cancelarse
 */
router.post('/subscription/reactivate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const subscription = await subscriptionService.reactivateSubscription(userId);

    // Invalidar cache
    premiumFeaturesService.invalidateCache(userId);

    res.json({
      success: true,
      data: subscription,
      message: 'Suscripción reactivada',
    });
  } catch (error) {
    logger.error('Error reactivando suscripción:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error reactivando suscripción',
    });
  }
});

/**
 * POST /api/v1/payments/billing-portal
 * Crea sesión del portal de facturación de Stripe
 */
router.post('/billing-portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const result = await subscriptionService.createBillingPortalSession(userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error creando portal de facturación:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error creando portal de facturación',
    });
  }
});

// ==================== MÉTODOS DE PAGO ====================

/**
 * GET /api/v1/payments/payment-methods
 * Lista los métodos de pago del usuario
 */
router.get('/payment-methods', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const methods = await paymentService.getUserPaymentMethods(userId);

    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    logger.error('Error obteniendo métodos de pago:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo métodos de pago',
    });
  }
});

/**
 * POST /api/v1/payments/payment-methods
 * Guarda un nuevo método de pago
 */
router.post('/payment-methods', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const input = req.body as SavePaymentMethodInput;

    if (!input.stripePaymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'stripePaymentMethodId es requerido',
      });
    }

    const method = await paymentService.savePaymentMethod(userId, input);

    res.json({
      success: true,
      data: method,
      message: 'Método de pago guardado',
    });
  } catch (error) {
    logger.error('Error guardando método de pago:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error guardando método de pago',
    });
  }
});

/**
 * DELETE /api/v1/payments/payment-methods/:id
 * Elimina un método de pago
 */
router.delete('/payment-methods/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const methodId = req.params.id;

    await paymentService.deletePaymentMethod(userId, methodId);

    res.json({
      success: true,
      message: 'Método de pago eliminado',
    });
  } catch (error) {
    logger.error('Error eliminando método de pago:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error eliminando método de pago',
    });
  }
});

/**
 * POST /api/v1/payments/payment-methods/:id/default
 * Establece un método de pago como predeterminado
 */
router.post('/payment-methods/:id/default', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const methodId = req.params.id;

    await paymentService.setDefaultPaymentMethod(userId, methodId);

    res.json({
      success: true,
      message: 'Método de pago establecido como predeterminado',
    });
  } catch (error) {
    logger.error('Error estableciendo método de pago:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error estableciendo método de pago',
    });
  }
});

// ==================== HISTORIAL DE PAGOS ====================

/**
 * GET /api/v1/payments/history
 * Obtiene el historial de pagos del usuario
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit, offset } = req.query;

    const result = await paymentService.getUserPayments(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo historial de pagos',
    });
  }
});

// ==================== DATOS FISCALES ====================

/**
 * GET /api/v1/payments/fiscal-data
 * Obtiene los datos fiscales del usuario
 */
router.get('/fiscal-data', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const fiscalData = await invoiceService.getUserFiscalData(userId);

    res.json({
      success: true,
      data: fiscalData,
    });
  } catch (error) {
    logger.error('Error obteniendo datos fiscales:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo datos fiscales',
    });
  }
});

/**
 * POST /api/v1/payments/fiscal-data
 * Guarda/actualiza los datos fiscales del usuario
 */
router.post('/fiscal-data', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const input = req.body as SaveFiscalDataInput;

    // Validaciones básicas
    if (!input.rfc || !input.razonSocial || !input.regimenFiscal || !input.codigoPostal || !input.emailFacturacion) {
      return res.status(400).json({
        success: false,
        error: 'RFC, razón social, régimen fiscal, código postal y email son requeridos',
      });
    }

    const fiscalData = await invoiceService.saveFiscalData(userId, input);

    res.json({
      success: true,
      data: fiscalData,
      message: 'Datos fiscales guardados',
    });
  } catch (error) {
    logger.error('Error guardando datos fiscales:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error guardando datos fiscales',
    });
  }
});

// ==================== FACTURAS ====================

/**
 * GET /api/v1/payments/invoices
 * Lista las facturas del usuario
 */
router.get('/invoices', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit, offset } = req.query;

    const result = await invoiceService.getUserInvoices(userId, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo facturas:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo facturas',
    });
  }
});

/**
 * POST /api/v1/payments/invoices/generate
 * Genera una factura CFDI para un pago
 */
router.post('/invoices/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const input = req.body as GenerateInvoiceInput;

    if (!input.paymentId) {
      return res.status(400).json({
        success: false,
        error: 'paymentId es requerido',
      });
    }

    const invoice = await invoiceService.generateInvoice(userId, input);

    res.json({
      success: true,
      data: invoice,
      message: 'Factura generada exitosamente',
    });
  } catch (error) {
    logger.error('Error generando factura:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error generando factura',
    });
  }
});

/**
 * POST /api/v1/payments/invoices/:id/resend
 * Reenvía una factura por email
 */
router.post('/invoices/:id/resend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const invoiceId = req.params.id;

    await invoiceService.resendInvoice(invoiceId, userId);

    res.json({
      success: true,
      message: 'Factura reenviada',
    });
  } catch (error) {
    logger.error('Error reenviando factura:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error reenviando factura',
    });
  }
});

// ==================== VERIFICACIÓN DE FEATURES ====================

/**
 * GET /api/v1/payments/check-feature/:feature
 * Verifica si el usuario tiene acceso a una feature
 */
router.get('/check-feature/:feature', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const feature = req.params.feature as keyof import('./types/payments.types').PlanFeatures;

    const hasAccess = await premiumFeaturesService.hasFeature(userId, feature);

    res.json({
      success: true,
      data: {
        feature,
        hasAccess,
      },
    });
  } catch (error) {
    logger.error('Error verificando feature:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error verificando feature',
    });
  }
});

/**
 * GET /api/v1/payments/check-limit/:limit
 * Verifica el límite de un recurso para el usuario
 */
router.get('/check-limit/:limit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limitKey = req.params.limit as keyof import('./types/payments.types').PlanLimits;

    const limit = await premiumFeaturesService.getLimit(userId, limitKey);

    res.json({
      success: true,
      data: {
        limit: limitKey,
        value: limit,
        isUnlimited: limit === 0,
      },
    });
  } catch (error) {
    logger.error('Error verificando límite:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error verificando límite',
    });
  }
});

export default router;
