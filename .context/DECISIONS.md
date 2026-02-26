# DECISIONS - Sistema VIDA

## Decisiones Arquitectonicas

### 2026-02-26 - Migración Twilio → WABA
- **Decision:** Migrar WhatsApp de Twilio a WABA (Meta Cloud API directo)
- **Razon:** Cliente ya tiene números WABA dados de alta
- **Estrategia:** Provider Pattern + Feature Flags para rollback instantáneo
- **Plan:** `.context/PLAN-current.md`

### 2026-02-26 - Estructura de Contexto v5
- **Decision:** Adoptar protocolo de contexto v5 con archivos separados
- **Razon:** Mejor organizacion y continuidad entre sesiones
- **Archivos:** STATUS.md, DECISIONS.md, BLOCKERS.md, AREAS.md, HANDOFF-*.md

### Historicas (pre-contexto)

#### Encriptacion de Datos Sensibles
- **Decision:** AES-256-GCM para datos medicos
- **Campos:** allergiesEnc, conditionsEnc, medicationsEnc, donorPreferencesEnc
- **Razon:** Cumplimiento con regulaciones de datos de salud en Mexico

#### Sistema de Notificaciones Multi-Canal
- **Decision:** Twilio (SMS/WhatsApp) + Resend (Email)
- **Razon:** Redundancia y cobertura para emergencias medicas
- **Fallback:** Modo simulacion cuando credenciales no estan configuradas

#### Autenticacion JWT
- **Decision:** Access tokens 15min + Refresh tokens 7 dias
- **Razon:** Balance entre seguridad y UX
- **Implementacion:** Rotacion de tokens en cada refresh
