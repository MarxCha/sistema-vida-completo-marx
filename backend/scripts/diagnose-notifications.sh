#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DE NOTIFICACIONES"
echo "=========================================="

# 1. Verificar si los servicios están configurados correctamente
echo "📧 1. Verificación de configuración de servicios..."

# Variables de entorno críticas
echo "TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID:-'NO CONFIGURADO'}"
echo "TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:-'NO CONFIGURADO'}"
echo "TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER:-'NO CONFIGURADO'}"
echo "TWILIO_WHATSAPP_NUMBER: ${TWILIO_WHATSAPP_NUMBER:-'NO CONFIGURADO'}"
echo "RESEND_API_KEY: ${RESEND_API_KEY:-'NO CONFIGURADO'}"
echo "EMAIL_FROM: ${EMAIL_FROM:-'NO CONFIGURADO'}"

# 2. Verificar logs del sistema de notificaciones
echo ""
echo "📋 2. Buscando logs recientes de notificaciones..."

# Buscar logs de errores en notificaciones
if [ -f "logs/app.log" ]; then
    echo "Últimos 50 líneas de logs de la aplicación:"
    echo "------------------------------------------"
    tail -50 logs/app.log | grep -i "notification\|twilio\|whatsapp\|email\|sms"
else
    echo "No se encontró archivo logs/app.log"
fi

# 3. Verificar si hay representantes configurados
echo ""
echo "👥 3. Verificación de representantes configurados..."

# Consultar base de datos para representantes
echo "SELECT COUNT(*) as total_representatives, 
       COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as con_email,
       COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as con_phone,
       COUNT(CASE WHEN \"notifyOnEmergency\" = true THEN 1 END) as notificacion_activa
FROM \"Representative\";" > /tmp/rep_query.sql

echo "Consulta SQL generada para verificar representantes:"
cat /tmp/rep_query.sql

# 4. Verificar si las notificaciones se están guardando en BD
echo ""
echo "📊 4. Verificación de notificaciones guardadas..."

echo "SELECT COUNT(*) as total_notificaciones,
       COUNT(CASE WHEN status = 'SENT' THEN 1 END) as exitosas,
       COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as fallidas,
       COUNT(CASE WHEN channel = 'SMS' THEN 1 END) as sms_enviados,
       COUNT(CASE WHEN channel = 'WHATSAPP' THEN 1 END) as whatsapp_enviados,
       COUNT(CASE WHEN channel = 'EMAIL' THEN 1 END) as emails_enviados,
       MAX(\"createdAt\") as ultima_notificacion
FROM \"Notification\" 
WHERE \"createdAt\" >= NOW() - INTERVAL '24 hours';" > /tmp/notif_query.sql

echo "Consulta SQL generada para verificar notificaciones:"
cat /tmp/notif_query.sql

# 5. Verificar configuración actual de notificaciones
echo ""
echo "🔧 5. Verificación de configuración actual..."

# Buscar la configuración actual en el código
echo "Verificando configuración de Twilio y Resend..."

# 6. Probar envío manual
echo ""
echo "🧪 6. Prueba manual de notificación..."

# Crear script de prueba para verificar que todo funciona
cat > /tmp/test_notificacion.js << 'EOF'
// Script de prueba para notificaciones
const axios = require('axios');

async function testNotificacion() {
  try {
    console.log('🔄 Intentando activar emergencia de prueba...');
    
    const response = await axios.post('https://api.vida.mdconsultoria-ti.org/api/v1/emergency/panic', {
      location: {
        lat: 19.4326,
        lng: -99.1332
      }
    });
    
    console.log('Response:', response.status, response.data);
    
    if (response.data.success) {
      console.log('✅ Emergencia activada, verificando si se enviaron notificaciones...');
      
      // Esperar 10 segundos y verificar notificaciones
      setTimeout(async () => {
        try {
          const notificationResponse = await axios.get('https://api.vida.mdconsultoria-ti.org/api/v1/representatives', {
            headers: {
              'Authorization': 'Bearer demo-token'
            }
          });
          console.log('Representantes:', notificationResponse.data);
        } catch (error) {
          console.log('Error verificando representantes:', error.message);
        }
      }, 10000);
    } else {
      console.log('❌ Falló activación de emergencia:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Error en prueba:', error.message);
  }
}

testNotificacion();
EOF

echo "Script de prueba creado en /tmp/test_notificacion.js"

# 7. Resumen del diagnóstico
echo ""
echo "📋 7. RESUMEN DEL DIAGNÓSTICO"
echo "=================================="

echo "✅ POSIBLES PROBLEMAS IDENTIFICADOS:"
echo "├── Variables de entorno no configuradas (TWILIO_*, RESEND_API_KEY)"
echo "├── Servicios de Twilio/Resend en modo simulación"
echo "├── Falta de credenciales válidas"
echo "├── No hay representantes con notifyOnEmergency=true"
echo "├── Errors de configuración en producción"
echo "└── Problemas de conectividad con APIs externas"

echo ""
echo "💡 SOLUCIONES REQUERIDAS:"
echo "├── Configurar credenciales de Twilio (Account SID, Auth Token)"
echo "├── Configurar números de teléfono y WhatsApp en Twilio"
echo "├── Configurar API key de Resend para emails"
echo "├── Verificar que representantes tengan notifyOnEmergency=true"
echo "├── Probar envío manual de notificaciones"
echo "└── Revisar logs de errores específicos"

echo ""
echo "🔍 Para ejecutar pruebas manuales:"
echo "   node /tmp/test_notificacion.js"
echo "   curl -X POST https://api.vida.mdconsultoria-ti.org/api/v1/emergency/panic -H 'Content-Type: application/json' -d '{\"location\":{\"lat\":19.4326,\"lng\":-99.1332}}'"

rm -f /tmp/rep_query.sql /tmp/notif_query.sql