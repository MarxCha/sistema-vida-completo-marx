# PLAN: Migración Twilio → WABA (WhatsApp Business API)

**Estado:** ACTIVO
**Fecha:** 2026-02-26
**Prioridad:** ALTA
**Riesgo:** BAJO (migración gradual con feature flags)

---

## Objetivo

Reemplazar Twilio por WABA (WhatsApp Business API directo) para mensajes WhatsApp, manteniendo:
- Zero downtime
- Rollback instantáneo
- SMS funcionando (evaluar alternativa o mantener Twilio solo para SMS)

---

## Análisis del Estado Actual

### Código Actual (`notification.service.ts`)
```
┌─────────────────────────────────────────────────────┐
│ NotificationService                                  │
├─────────────────────────────────────────────────────┤
│ - twilioClient (SMS + WhatsApp)                     │
│ - resend (Email)                                    │
│ - isSimulationMode                                  │
├─────────────────────────────────────────────────────┤
│ Métodos:                                            │
│ • sendEmergencySMS() → Twilio                       │
│ • sendEmergencyWhatsApp() → Twilio                  │
│ • sendEmergencyEmail() → Resend                     │
│ • notifyAllRepresentatives() → Orquesta los 3      │
└─────────────────────────────────────────────────────┘
```

### Variables Actuales (Twilio)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER` (SMS)
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_WHATSAPP_TEMPLATE_ID`

---

## Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────┐
│ NotificationService (Orquestador)                   │
├─────────────────────────────────────────────────────┤
│ Providers:                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ SMSProvider │ │ WABAProvider│ │EmailProvider│    │
│ │  (Twilio)   │ │   (WABA)    │ │  (Resend)   │    │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
│                        │                            │
│              ┌─────────┴─────────┐                 │
│              │ TwilioWAProvider  │ ← Fallback      │
│              │   (deprecated)    │                 │
│              └───────────────────┘                 │
└─────────────────────────────────────────────────────┘

Feature Flags:
• WHATSAPP_PROVIDER = "waba" | "twilio"
• WABA_FALLBACK_TO_TWILIO = true | false
```

---

## Fases de Implementación

### FASE 1: Preparación (1-2 horas)
**Sin cambios en producción**

- [ ] 1.1 Crear interfaz `IWhatsAppProvider`
- [ ] 1.2 Refactorizar código actual de Twilio WhatsApp a `TwilioWhatsAppProvider`
- [ ] 1.3 Crear `WABAProvider` (nuevo)
- [ ] 1.4 Crear `WhatsAppProviderFactory` con feature flag
- [ ] 1.5 Agregar variables de entorno para WABA
- [ ] 1.6 Tests unitarios para ambos providers

### FASE 2: Integración WABA (2-3 horas)
**Desarrollo local + staging**

- [ ] 2.1 Implementar autenticación WABA (token, phone_number_id)
- [ ] 2.2 Implementar envío de mensajes template
- [ ] 2.3 Implementar envío de mensajes de sesión
- [ ] 2.4 Manejar webhooks de status (opcional)
- [ ] 2.5 Logging y métricas
- [ ] 2.6 Tests de integración

### FASE 3: Migración Gradual (1 hora)
**Producción con feature flags**

- [ ] 3.1 Deploy con `WHATSAPP_PROVIDER=twilio` (sin cambios)
- [ ] 3.2 Configurar variables WABA en Coolify
- [ ] 3.3 Cambiar a `WHATSAPP_PROVIDER=waba` + `WABA_FALLBACK_TO_TWILIO=true`
- [ ] 3.4 Monitorear logs y métricas
- [ ] 3.5 Desactivar fallback: `WABA_FALLBACK_TO_TWILIO=false`

### FASE 4: Limpieza (30 min)
**Post-migración exitosa**

- [ ] 4.1 Remover código de TwilioWhatsAppProvider (o mantener como fallback)
- [ ] 4.2 Actualizar documentación
- [ ] 4.3 Actualizar BLOCKERS.md
- [ ] 4.4 Evaluar: mantener Twilio solo para SMS o migrar a alternativa

---

## Variables de Entorno WABA

```bash
# WhatsApp Business API (Meta Cloud API)
WABA_PHONE_NUMBER_ID=123456789012345
WABA_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
WABA_BUSINESS_ACCOUNT_ID=987654321098765
WABA_WEBHOOK_VERIFY_TOKEN=your-verify-token
WABA_API_VERSION=v18.0

# Feature Flags
WHATSAPP_PROVIDER=waba  # "waba" | "twilio"
WABA_FALLBACK_TO_TWILIO=false

# Templates WABA (pre-aprobados por Meta)
WABA_TEMPLATE_EMERGENCY=emergency_alert_v1
WABA_TEMPLATE_ACCESS=access_notification_v1
```

---

## Estructura de Archivos Propuesta

```
backend/src/modules/notification/
├── notification.service.ts          # Orquestador (sin cambios en interfaz)
├── providers/
│   ├── index.ts                      # Exports
│   ├── interfaces.ts                 # IWhatsAppProvider, ISMSProvider
│   ├── whatsapp/
│   │   ├── waba.provider.ts          # NUEVO: WhatsApp Business API
│   │   ├── twilio-wa.provider.ts     # Refactorizado de código actual
│   │   └── factory.ts                # WhatsAppProviderFactory
│   ├── sms/
│   │   └── twilio-sms.provider.ts    # SMS (mantener Twilio)
│   └── email/
│       └── resend.provider.ts        # Email (sin cambios)
└── templates/
    ├── emergency.template.ts         # Templates de mensajes
    └── access.template.ts
```

---

## Plan de Rollback

### Si WABA falla en producción:

```bash
# Rollback instantáneo (sin redeploy)
WHATSAPP_PROVIDER=twilio
```

### Si hay errores críticos:

1. Cambiar `WHATSAPP_PROVIDER=twilio` en Coolify
2. El sistema usa Twilio inmediatamente
3. Investigar logs de WABA
4. Corregir y volver a intentar

---

## Criterios de Éxito

| Métrica | Objetivo |
|---------|----------|
| Mensajes entregados | > 95% |
| Latencia promedio | < 3 segundos |
| Errores de API | < 1% |
| Downtime | 0 minutos |

---

## Dependencias

### WABA (Meta Cloud API)
- Cuenta de WhatsApp Business verificada
- Números dados de alta (YA TIENEN)
- Templates aprobados por Meta
- Access Token válido

### Código
- Node.js 18+
- axios o node-fetch para HTTP
- No se necesita SDK oficial (API REST directa)

---

## Próximo Paso

**Ejecutar FASE 1.1:** Crear interfaz `IWhatsAppProvider`

¿Procedo con la implementación?
