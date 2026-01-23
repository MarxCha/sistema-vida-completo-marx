#!/bin/bash

# Script para probar envío de email a Carlos Amador
# Requiere: RESEND_API_KEY configurada en variables de entorno

echo "🧪 Probando envío de email a Carlos Amador..."

# Verificar si hay API key de Resend
if [ -z "$RESEND_API_KEY" ]; then
    echo "❌ ERROR: RESEND_API_KEY no está configurada"
    echo "   Por favor, ejecuta: export RESEND_API_KEY=re_xxxxxxxxxxxxxxxx"
    exit 1
fi

# Enviar email de prueba usando curl directamente a la API de Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "notificaciones@sistemavida.mx",
    "to": ["carlos_amador@outlook.com"],
    "subject": "🧪 PRUEBA - Sistema VIDA",
    "html": "
      <h1>Prueba de Envío - Sistema VIDA</h1>
      <p>Este es un email de prueba para verificar que Carlos Amador puede recibir notificaciones del Sistema VIDA.</p>
      <p><strong>Fecha y hora:</strong> '$(date)'</p>
      <p><strong>Desde:</strong> Sistema VIDA - Prueba Técnica</p>
      <hr>
      <p><small>Si recibes este email, la configuración es correcta y Carlos Amador será notificado en emergencias.</small></p>
    "
  }'

echo ""
echo "✅ Solicitud enviada. Revisa la bandeja de entrada de carlos_amador@outlook.com"