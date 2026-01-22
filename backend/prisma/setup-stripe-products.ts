// prisma/setup-stripe-products.ts
// Script para crear productos y precios en Stripe y actualizar la base de datos

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

async function setupStripeProducts() {
  console.log('🚀 Configurando productos en Stripe...\n');

  try {
    // ==================== PLAN BÁSICO ====================
    console.log('📦 Creando producto "Plan Básico VIDA"...');

    const basicProduct = await stripe.products.create({
      name: 'Plan Básico VIDA',
      description: 'Acceso esencial a Sistema VIDA. Incluye perfil médico digital, QR de emergencia y hasta 2 representantes.',
      metadata: {
        slug: 'basico',
      },
    });

    console.log(`   ✅ Producto creado: ${basicProduct.id}`);

    // Precio mensual básico
    console.log('\n💰 Creando precio mensual básico ($49 MXN/mes)...');

    const basicMonthlyPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 4900, // $49.00 MXN en centavos
      currency: 'mxn',
      recurring: {
        interval: 'month',
      },
      metadata: {
        billingCycle: 'MONTHLY',
        plan: 'basico',
      },
    });

    console.log(`   ✅ Precio mensual creado: ${basicMonthlyPrice.id}`);

    // Precio anual básico
    console.log('\n💰 Creando precio anual básico ($490 MXN/año)...');

    const basicAnnualPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 49000, // $490.00 MXN en centavos
      currency: 'mxn',
      recurring: {
        interval: 'year',
      },
      metadata: {
        billingCycle: 'ANNUAL',
        plan: 'basico',
      },
    });

    console.log(`   ✅ Precio anual creado: ${basicAnnualPrice.id}`);

    // ==================== PLAN PREMIUM ====================
    console.log('\n📦 Creando producto "Plan Premium VIDA"...');

    const premiumProduct = await stripe.products.create({
      name: 'Plan Premium VIDA',
      description: 'Acceso completo a todas las funciones de Sistema VIDA. Incluye directivas de voluntad anticipada, preferencias de donación, sello NOM-151, notificaciones SMS ilimitadas y soporte prioritario.',
      metadata: {
        slug: 'premium',
      },
    });

    console.log(`   ✅ Producto creado: ${premiumProduct.id}`);

    // Precio mensual premium
    console.log('\n💰 Creando precio mensual premium ($149 MXN/mes)...');

    const premiumMonthlyPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 14900, // $149.00 MXN en centavos
      currency: 'mxn',
      recurring: {
        interval: 'month',
      },
      metadata: {
        billingCycle: 'MONTHLY',
        plan: 'premium',
      },
    });

    console.log(`   ✅ Precio mensual creado: ${premiumMonthlyPrice.id}`);

    // Precio anual premium
    console.log('\n💰 Creando precio anual premium ($1,490 MXN/año)...');

    const premiumAnnualPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 149000, // $1,490.00 MXN en centavos
      currency: 'mxn',
      recurring: {
        interval: 'year',
      },
      metadata: {
        billingCycle: 'ANNUAL',
        plan: 'premium',
      },
    });

    console.log(`   ✅ Precio anual creado: ${premiumAnnualPrice.id}`);

    // ==================== ACTUALIZAR BASE DE DATOS ====================
    console.log('\n📝 Actualizando planes en la base de datos...');

    // Actualizar plan Básico
    try {
      const updatedBasico = await prisma.subscriptionPlan.update({
        where: { slug: 'basico' },
        data: {
          stripeProductId: basicProduct.id,
          stripePriceIdMonthly: basicMonthlyPrice.id,
          stripePriceIdAnnual: basicAnnualPrice.id,
        },
      });
      console.log(`   ✅ Plan Básico actualizado: ${updatedBasico.name}`);
    } catch (e) {
      console.log('   ⚠️  Plan Básico no encontrado en BD, se creará con el seed');
    }

    // Actualizar plan Premium
    try {
      const updatedPremium = await prisma.subscriptionPlan.update({
        where: { slug: 'premium' },
        data: {
          stripeProductId: premiumProduct.id,
          stripePriceIdMonthly: premiumMonthlyPrice.id,
          stripePriceIdAnnual: premiumAnnualPrice.id,
        },
      });
      console.log(`   ✅ Plan Premium actualizado: ${updatedPremium.name}`);
    } catch (e) {
      console.log('   ⚠️  Plan Premium no encontrado en BD, se creará con el seed');
    }

    // ==================== RESUMEN ====================
    console.log('\n' + '═'.repeat(60));
    console.log('✅ CONFIGURACIÓN DE STRIPE COMPLETADA');
    console.log('═'.repeat(60));

    console.log('\n📋 PLAN BÁSICO ($49 MXN/mes):');
    console.log(`   Producto:       ${basicProduct.id}`);
    console.log(`   Precio Mensual: ${basicMonthlyPrice.id}`);
    console.log(`   Precio Anual:   ${basicAnnualPrice.id}`);

    console.log('\n📋 PLAN PREMIUM ($149 MXN/mes):');
    console.log(`   Producto:       ${premiumProduct.id}`);
    console.log(`   Precio Mensual: ${premiumMonthlyPrice.id}`);
    console.log(`   Precio Anual:   ${premiumAnnualPrice.id}`);

    console.log('\n🎉 ¡Stripe está listo para procesar pagos!');
    console.log('\n📌 Para probar, usa estas tarjetas de test:');
    console.log('   • Pago exitoso:     4242 4242 4242 4242');
    console.log('   • 3D Secure:        4000 0000 0000 3220');
    console.log('   • Declinada:        4000 0000 0000 0002');
    console.log('\n   Fecha: Cualquier fecha futura');
    console.log('   CVC: Cualquier 3 dígitos');
    console.log('\n' + '═'.repeat(60) + '\n');

    // Guardar IDs para copiar al seed
    console.log('📋 COPIA ESTOS IDs PARA ACTUALIZAR EL SEED:');
    console.log(`
// Plan Básico
stripeProductId: '${basicProduct.id}',
stripePriceIdMonthly: '${basicMonthlyPrice.id}',
stripePriceIdAnnual: '${basicAnnualPrice.id}',

// Plan Premium
stripeProductId: '${premiumProduct.id}',
stripePriceIdMonthly: '${premiumMonthlyPrice.id}',
stripePriceIdAnnual: '${premiumAnnualPrice.id}',
`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupStripeProducts();
