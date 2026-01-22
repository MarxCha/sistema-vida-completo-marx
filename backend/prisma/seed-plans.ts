// prisma/seed-plans.ts
// Script para crear los planes de suscripción iniciales
//
// Ejecutar con: npx ts-node prisma/seed-plans.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('🌱 Sembrando planes de suscripción...\n');

  // Plan Gratuito
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Plan Gratuito',
      slug: 'free',
      description: 'Acceso básico a Sistema VIDA. Incluye perfil médico, código QR de emergencia y hasta 2 representantes.',
      priceMonthly: null,
      priceAnnual: null,
      currency: 'MXN',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      stripeProductId: null,
      features: {
        advanceDirectives: false,      // Directivas de voluntad anticipada
        donorPreferences: false,       // Preferencias de donación de órganos
        nom151Seal: false,             // Sello NOM-151 para documentos
        smsNotifications: false,       // Notificaciones SMS a representantes
        exportData: false,             // Exportar datos del perfil
        prioritySupport: false,        // Soporte prioritario
      },
      limits: {
        representativesLimit: 2,       // Máximo de representantes
        qrDownloadsPerMonth: 3,        // Descargas de QR por mes
      },
      trialDays: 0,
      isActive: true,
      isDefault: true,
      displayOrder: 0,
    },
  });
  console.log(`✅ Plan creado: ${freePlan.name} (${freePlan.slug})`);

  // Plan Premium Mensual
  const premiumMonthly = await prisma.subscriptionPlan.upsert({
    where: { slug: 'premium' },
    update: {},
    create: {
      name: 'Plan Premium',
      slug: 'premium',
      description: 'Acceso completo a todas las funciones de Sistema VIDA. Incluye directivas de voluntad anticipada, preferencias de donación, sello NOM-151, notificaciones SMS ilimitadas y soporte prioritario.',
      priceMonthly: 149.00,
      priceAnnual: 1490.00, // ~17% descuento
      currency: 'MXN',
      // NOTA: Estos IDs deben actualizarse con los reales de Stripe
      stripePriceIdMonthly: null, // Ej: 'price_xxxxxxxxxxxxx'
      stripePriceIdAnnual: null,  // Ej: 'price_xxxxxxxxxxxxx'
      stripeProductId: null,      // Ej: 'prod_xxxxxxxxxxxxx'
      features: {
        advanceDirectives: true,
        donorPreferences: true,
        nom151Seal: true,
        smsNotifications: true,
        exportData: true,
        prioritySupport: true,
      },
      limits: {
        representativesLimit: 10,
        qrDownloadsPerMonth: 0, // 0 = ilimitado
      },
      trialDays: 7, // 7 días de prueba
      isActive: true,
      isDefault: false,
      displayOrder: 1,
    },
  });
  console.log(`✅ Plan creado: ${premiumMonthly.name} (${premiumMonthly.slug})`);

  console.log('\n📋 Resumen de planes:');
  console.log('──────────────────────────────────────────────────');
  console.log(`
  Plan Gratuito:
    - Representantes: hasta 2
    - Descargas QR: 3/mes
    - Directivas: ❌
    - Donación órganos: ❌
    - NOM-151: ❌
    - SMS: ❌

  Plan Premium ($149/mes o $1,490/año):
    - Representantes: hasta 10
    - Descargas QR: ilimitadas
    - Directivas: ✅
    - Donación órganos: ✅
    - NOM-151: ✅
    - SMS: ✅
    - Trial: 7 días
  `);

  console.log('\n⚠️  IMPORTANTE:');
  console.log('──────────────────────────────────────────────────');
  console.log('1. Configura los productos y precios en Stripe Dashboard');
  console.log('2. Actualiza stripePriceIdMonthly, stripePriceIdAnnual y stripeProductId');
  console.log('3. Configura el webhook de Stripe apuntando a /api/v1/webhooks/stripe');
  console.log('4. Eventos de webhook requeridos:');
  console.log('   - checkout.session.completed');
  console.log('   - customer.subscription.created');
  console.log('   - customer.subscription.updated');
  console.log('   - customer.subscription.deleted');
  console.log('   - invoice.paid');
  console.log('   - invoice.payment_failed');
  console.log('   - payment_intent.succeeded');
  console.log('   - payment_intent.payment_failed');
  console.log('──────────────────────────────────────────────────\n');
}

async function main() {
  try {
    await seedPlans();
    console.log('🎉 Planes de suscripción sembrados exitosamente!\n');
  } catch (error) {
    console.error('❌ Error sembrando planes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
