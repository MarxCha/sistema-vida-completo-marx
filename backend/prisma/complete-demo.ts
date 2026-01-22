import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndComplete() {
  const user = await prisma.user.findUnique({
    where: { email: 'demo@sistemavida.mx' },
    include: {
      profile: true,
      representatives: true,
      directives: true
    }
  });

  console.log('=== Estado actual del usuario demo ===');
  console.log('Usuario:', user?.name);
  console.log('Perfil:', user?.profile ? 'Existe' : 'No existe');
  console.log('Representantes:', user?.representatives?.length || 0);
  console.log('Directivas:', user?.directives?.length || 0);

  if (!user) {
    console.log('Usuario no encontrado');
    return;
  }

  // Crear representantes si no existen
  if (!user.representatives || user.representatives.length === 0) {
    console.log('\nCreando representantes...');
    await prisma.representative.createMany({
      data: [
        {
          userId: user.id,
          name: 'Maria Garcia Lopez',
          phone: '5512345678',
          email: 'maria.garcia@ejemplo.mx',
          relation: 'SPOUSE',
          priority: 1,
          isDonorSpokesperson: true,
          notifyOnEmergency: true,
          notifyOnAccess: true,
        },
        {
          userId: user.id,
          name: 'Carlos Demo Hernandez',
          phone: '5587654321',
          email: 'carlos.demo@ejemplo.mx',
          relation: 'SIBLING',
          priority: 2,
          isDonorSpokesperson: false,
          notifyOnEmergency: true,
          notifyOnAccess: false,
        }
      ]
    });
    console.log('   2 representantes creados');
  }

  // Crear directiva si no existe
  if (!user.directives || user.directives.length === 0) {
    console.log('\nCreando directiva de voluntad anticipada...');
    await prisma.advanceDirective.create({
      data: {
        userId: user.id,
        type: 'DIGITAL_DRAFT',
        status: 'ACTIVE',
        acceptsCPR: true,
        acceptsIntubation: false,
        acceptsDialysis: true,
        acceptsTransfusion: true,
        acceptsArtificialNutrition: false,
        palliativeCareOnly: true,
        originState: 'CDMX',
      }
    });
    console.log('   Directiva creada');
  }

  console.log('\nPerfil completado');
}

checkAndComplete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
