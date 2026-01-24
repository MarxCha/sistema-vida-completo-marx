
import { notificationService } from '../src/modules/notification/notification.service';

async function testDelivery() {
  const targetPhone = process.argv[2];
  const targetEmail = process.argv[3];

  if (!targetPhone || !targetEmail) {
    console.error('Uso: ts-node scripts/test-delivery.ts <telefono> <email>');
    console.error('Ejemplo: ts-node scripts/test-delivery.ts +525512345678 usuario@ejemplo.com');
    process.exit(1);
  }

  console.log(`🚀 Iniciando prueba de entrega a:`);
  console.log(`📱 Teléfono: ${targetPhone}`);
  console.log(`📧 Email: ${targetEmail}`);

  // Simular datos de pánico
  const panicData = {
    patientName: 'Usuario de Prueba',
    location: { lat: 19.4326, lng: -99.1332 }, // CDMX Zócalo
    type: 'PANIC' as const,
    nearestHospital: 'Hospital General de México'
  };

  // 1. Prueba SMS
  console.log('\nTesting SMS...');
  try {
    const smsResult = await notificationService.sendEmergencySMS({
      to: targetPhone,
      ...panicData
    });
    console.log('SMS Result:', smsResult);
  } catch (error) {
    console.error('SMS Failed:', error);
  }

  // 2. Prueba WhatsApp
  console.log('\nTesting WhatsApp...');
  try {
    const waResult = await notificationService.sendEmergencyWhatsApp({
      to: targetPhone,
      ...panicData
    });
    console.log('WhatsApp Result:', waResult);
  } catch (error) {
    console.error('WhatsApp Failed:', error);
  }

  // 3. Prueba Email
  console.log('\nTesting Email...');
  try {
    const emailResult = await notificationService.sendEmergencyEmail({
      to: targetEmail,
      ...panicData
    });
    console.log('Email Result:', emailResult);
  } catch (error) {
    console.error('Email Failed:', error);
  }
}

testDelivery();
