// src/modules/odoo/odoo.controller.ts
import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../common/guards/admin-auth.middleware';
import { odooService } from './odoo.service';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/odoo/status
 * Verifica el estado de conexión con Odoo
 */
router.get('/status', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const isConfigured = odooService.isConfigured();

    if (!isConfigured) {
      return res.json({
        configured: false,
        connected: false,
        message: 'Odoo no está configurado. Verificar variables de entorno.',
      });
    }

    const connected = await odooService.testConnection();

    res.json({
      configured: true,
      connected,
      message: connected ? 'Conexión exitosa con Odoo' : 'Error conectando a Odoo',
    });
  } catch (error) {
    res.status(500).json({
      configured: odooService.isConfigured(),
      connected: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/v1/admin/odoo/sync/products
 * Sincroniza los planes de suscripción como productos en Odoo
 */
router.post('/sync/products', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    if (!odooService.isConfigured()) {
      return res.status(400).json({ error: 'Odoo no está configurado' });
    }

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });

    const results = [];

    for (const plan of plans) {
      try {
        const productId = await odooService.createProduct({
          name: `Sistema VIDA - ${plan.name}`,
          ref: `VIDA-${plan.id}`,
          price: plan.priceMonthly ? Number(plan.priceMonthly) : 0,
          description: plan.description || undefined,
        });
        results.push({
          planId: plan.id,
          planName: plan.name,
          odooProductId: productId,
          status: 'success',
        });
      } catch (error) {
        results.push({
          planId: plan.id,
          planName: plan.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    res.json({
      message: 'Sincronización de productos completada',
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

/**
 * POST /api/v1/admin/odoo/sync/payments
 * Sincroniza pagos pendientes a Odoo (últimos 30 días)
 */
router.post('/sync/payments', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    if (!odooService.isConfigured()) {
      return res.status(400).json({ error: 'Odoo no está configurado' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const payments = await prisma.payment.findMany({
      where: {
        status: 'SUCCEEDED',
        paidAt: { gte: thirtyDaysAgo },
      },
      include: {
        user: true,
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const results = [];

    for (const payment of payments) {
      try {
        const result = await odooService.syncStripePayment({
          customerEmail: payment.user.email,
          customerName: payment.user.name,
          customerPhone: payment.user.phone || undefined,
          planName: payment.subscription?.plan.name || 'Pago Sistema VIDA',
          planRef: payment.subscription ? `VIDA-${payment.subscription.planId}` : 'VIDA-MISC',
          amount: Math.round(Number(payment.amount) * 100), // Convertir a centavos
          stripePaymentId: payment.stripePaymentIntentId || payment.id,
          stripeInvoiceId: payment.stripeInvoiceId || undefined,
        });
        results.push({
          paymentId: payment.id,
          amount: payment.amount,
          status: 'success',
          odoo: result,
        });
      } catch (error) {
        results.push({
          paymentId: payment.id,
          amount: payment.amount,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    res.json({
      message: `Sincronización completada: ${results.filter(r => r.status === 'success').length}/${results.length} pagos`,
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
});

export default router;
