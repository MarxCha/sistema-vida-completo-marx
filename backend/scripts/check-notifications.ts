
import { notificationService } from '../src/modules/notification/notification.service';
import { logger } from '../src/common/services/logger.service';

async function checkNotifications() {
  console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN DE NOTIFICACIONES');
  console.log('==================================================');

  const configStatus = notificationService.validateConfiguration();

  console.log('\n📱 Estado de Twilio (SMS/WhatsApp):');
  if (configStatus.twilio.configured) {
    console.log('   ✅ Configurado correctamente');
  } else {
    console.log('   ❌ Faltan credenciales:');
    configStatus.twilio.missing.forEach((missing: string) => console.log(`      - ${missing}`));
  }

  console.log('\n📧 Estado de Resend (Email):');
  if (configStatus.email.configured) {
    console.log('   ✅ Configurado correctamente');
  } else {
    console.log('   ❌ Faltan credenciales:');
    configStatus.email.missing.forEach((missing: string) => console.log(`      - ${missing}`));
  }

  console.log('\n⚠️ Modo Simulación:');
  if (configStatus.simulationMode) {
    console.log('   🔴 ACTIVADO - Las notificaciones NO se enviarán realmente.');
  } else {
    console.log('   🟢 DESACTIVADO - Las notificaciones se enviarán a los destinatarios reales.');
  }

  console.log('\n==================================================');
}

checkNotifications().catch(error => {
  console.error('Error durante la verificación:', error);
  process.exit(1);
});
