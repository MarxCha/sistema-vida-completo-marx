# BLOCKERS - Sistema VIDA

## Activos

### BLOCKER-001: Migración WhatsApp a WABA
- **Estado:** CODIGO LISTO - Pendiente deploy
- **Impacto:** ALTO - Representantes no reciben alertas reales en emergencias
- **Código:** Migración completada (Provider Pattern + Feature Flags)
- **Pendiente deploy:**
  1. Ejecutar SQL: `prisma/migrations/add_whatsapp_channel.sql`
  2. Configurar en Coolify: `WABA_PHONE_NUMBER_ID`, `WABA_ACCESS_TOKEN`, `WABA_BUSINESS_ACCOUNT_ID`
  3. Activar: `WHATSAPP_PROVIDER=waba`, `WABA_FALLBACK_TO_TWILIO=true`
- **Variables Email (pendiente):**
  - `RESEND_API_KEY`
  - `EMAIL_FROM_RESEND`
- **Owner:** DevOps (deploy) + Backend (monitoreo)

### BLOCKER-002: Representantes sin Notificaciones Activadas
- **Estado:** ACTIVO
- **Impacto:** MEDIO - Algunos representantes con notifyOnEmergency=false
- **Solucion SQL:**
```sql
UPDATE "Representative"
SET "notifyOnEmergency" = true, "notifyOnAccess" = true;
```
- **Owner:** Backend

## Resueltos

(ninguno documentado aun)
