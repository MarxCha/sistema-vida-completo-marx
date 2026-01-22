// src/modules/payments/services/stripe.service.ts
import Stripe from 'stripe';
import config from '../../../config';
import { BillingCycle } from '@prisma/client';

// Inicializar Stripe solo si hay API key configurada
const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    })
  : null;

// Helper para verificar que Stripe está configurado
function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe no está configurado. Agrega STRIPE_SECRET_KEY en .env');
  }
  return stripe;
}

export const stripeService = {
  /**
   * Crear o recuperar un cliente de Stripe
   */
  async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    // Buscar cliente existente por metadata
    const existingCustomers = await requireStripe().customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }

    // Crear nuevo cliente
    return await requireStripe().customers.create({
      email,
      name,
      metadata: {
        userId,
        source: 'sistema-vida',
      },
    });
  },

  /**
   * Crear una sesión de Checkout para suscripción
   */
  async createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: params.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      locale: 'es',
      allow_promotion_codes: true,
    };

    // Agregar trial si aplica
    if (params.trialDays && params.trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: params.trialDays,
      };
    }

    return await requireStripe().checkout.sessions.create(sessionParams);
  },

  /**
   * Crear una sesión de Checkout para pago único con OXXO
   */
  async createOxxoCheckoutSession(params: {
    customerId: string;
    amount: number;
    description: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    return await requireStripe().checkout.sessions.create({
      customer: params.customerId,
      mode: 'payment',
      payment_method_types: ['oxxo'],
      line_items: [
        {
          price_data: {
            currency: config.stripe.currency,
            product_data: {
              name: params.description,
            },
            unit_amount: Math.round(params.amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      locale: 'es',
      payment_intent_data: {
        description: params.description,
      },
    });
  },

  /**
   * Crear un PaymentIntent para pago directo con tarjeta
   */
  async createPaymentIntent(params: {
    customerId: string;
    amount: number;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    const intentParams: Stripe.PaymentIntentCreateParams = {
      customer: params.customerId,
      amount: Math.round(params.amount * 100),
      currency: config.stripe.currency,
      description: params.description,
      metadata: params.metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    };

    if (params.paymentMethodId) {
      intentParams.payment_method = params.paymentMethodId;
      intentParams.confirm = true;
    }

    return await requireStripe().paymentIntents.create(intentParams);
  },

  /**
   * Crear una suscripción directamente
   */
  async createSubscription(params: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: params.customerId,
      items: [{ price: params.priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: params.metadata,
    };

    if (params.paymentMethodId) {
      subscriptionParams.default_payment_method = params.paymentMethodId;
    }

    if (params.trialDays && params.trialDays > 0) {
      subscriptionParams.trial_period_days = params.trialDays;
    }

    return await requireStripe().subscriptions.create(subscriptionParams);
  },

  /**
   * Actualizar una suscripción (cambio de plan)
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string,
    prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior = 'create_prorations'
  ): Promise<Stripe.Subscription> {
    const subscription = await requireStripe().subscriptions.retrieve(subscriptionId);

    return await requireStripe().subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: prorationBehavior,
    });
  },

  /**
   * Cancelar una suscripción
   */
  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<Stripe.Subscription> {
    if (cancelImmediately) {
      return await requireStripe().subscriptions.cancel(subscriptionId);
    }

    return await requireStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  },

  /**
   * Reactivar una suscripción cancelada (cancel_at_period_end)
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await requireStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  },

  /**
   * Obtener una suscripción
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await requireStripe().subscriptions.retrieve(subscriptionId);
  },

  /**
   * Crear portal de facturación para el cliente
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await requireStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  },

  /**
   * Adjuntar un método de pago al cliente
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return await requireStripe().paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  },

  /**
   * Establecer método de pago por defecto
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    return await requireStripe().customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  },

  /**
   * Obtener método de pago
   */
  async getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return await requireStripe().paymentMethods.retrieve(paymentMethodId);
  },

  /**
   * Listar métodos de pago del cliente
   */
  async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const result = await requireStripe().paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return result.data;
  },

  /**
   * Desadjuntar método de pago
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return await requireStripe().paymentMethods.detach(paymentMethodId);
  },

  /**
   * Crear un reembolso
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
  }): Promise<Stripe.Refund> {
    const refundParams: Stripe.RefundCreateParams = {};

    if (params.paymentIntentId) {
      refundParams.payment_intent = params.paymentIntentId;
    } else if (params.chargeId) {
      refundParams.charge = params.chargeId;
    }

    if (params.amount) {
      refundParams.amount = Math.round(params.amount * 100);
    }

    if (params.reason) {
      refundParams.reason = params.reason;
    }

    return await requireStripe().refunds.create(refundParams);
  },

  /**
   * Obtener invoice de Stripe
   */
  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    return await requireStripe().invoices.retrieve(invoiceId);
  },

  /**
   * Construir evento de webhook
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Stripe.Event {
    return requireStripe().webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
  },

  /**
   * Obtener el precio correcto según el ciclo de facturación
   */
  getPriceIdForCycle(
    stripePriceIdMonthly: string | null,
    stripePriceIdAnnual: string | null,
    billingCycle: BillingCycle
  ): string {
    const priceId = billingCycle === 'ANNUAL' ? stripePriceIdAnnual : stripePriceIdMonthly;

    if (!priceId) {
      throw new Error(`No hay precio configurado para el ciclo ${billingCycle}`);
    }

    return priceId;
  },
};
