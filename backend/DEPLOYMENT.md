# Guía de Despliegue - Sistema VIDA Backend

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- Redis (opcional, para sesiones en producción)
- Variables de entorno configuradas

## Configuración de Base de Datos

### Desarrollo

En desarrollo se usa `prisma db push` para sincronizar el esquema:

```bash
npx prisma db push
```

### Producción

Para producción, es necesario usar migraciones versionadas para tener control del historial de cambios.

#### Crear Baseline de Migraciones (Primera vez)

Si ya tienes una base de datos en producción usando `db push`, ejecuta estos pasos para crear una baseline:

```bash
# 1. Crear el directorio de migraciones
mkdir -p prisma/migrations

# 2. Generar la primera migración (en entorno de desarrollo)
npx prisma migrate dev --name initial_baseline

# 3. Marcar la migración como aplicada en producción (si la BD ya existe)
npx prisma migrate resolve --applied "20240114000000_initial_baseline"
```

#### Aplicar Migraciones en Producción

```bash
# Aplicar todas las migraciones pendientes
npx prisma migrate deploy

# Verificar estado de migraciones
npx prisma migrate status
```

## Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/vida_db"

# JWT
JWT_SECRET="..."
JWT_ADMIN_SECRET="..."
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AWS S3 (para documentos)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="vida-documents"

# Email (SMTP)
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="noreply@vida.mx"

# Twilio (SMS)
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Apple Wallet (opcional)
APPLE_WALLET_PASS_TYPE_ID="pass.mx.vida.emergency"
APPLE_WALLET_TEAM_ID="..."
APPLE_WALLET_CERTIFICATE_PATH="./certs/pass.pem"
APPLE_WALLET_KEY_PATH="./certs/pass-key.pem"

# Google Wallet (opcional)
GOOGLE_WALLET_ISSUER_ID="..."
GOOGLE_WALLET_CLASS_ID="..."
GOOGLE_WALLET_CREDENTIALS_PATH="./certs/google-wallet.json"

# Odoo (contabilidad, opcional)
ODOO_URL="https://odoo.example.com"
ODOO_DB="production"
ODOO_USERNAME="..."
ODOO_API_KEY="..."

# Entorno
NODE_ENV="production"
PORT=3000
FRONTEND_URL="https://vida.mx"
```

## Proceso de Despliegue

### 1. Preparar el Build

```bash
# Instalar dependencias
npm ci

# Compilar TypeScript
npm run build

# Generar cliente Prisma
npx prisma generate
```

### 2. Aplicar Migraciones

```bash
# Verificar estado
npx prisma migrate status

# Aplicar migraciones pendientes
npx prisma migrate deploy
```

### 3. Ejecutar Seeds (si es necesario)

```bash
# Solo para ambiente inicial
npx ts-node prisma/seed-plans.ts
npx ts-node prisma/seed-hospitals.ts
npx ts-node prisma/seed-admin.ts
```

### 4. Iniciar la Aplicación

```bash
# Producción
npm start

# O con PM2
pm2 start dist/main.js --name vida-backend
```

## Health Check

La aplicación expone un endpoint de health check:

```
GET /api/v1/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-14T...",
  "version": "1.0.0"
}
```

## Logs

En producción, los logs se envían a stdout en formato JSON estructurado.

Configurar agregador de logs (CloudWatch, Datadog, etc.) para capturar:
- `logger.info()` - Eventos normales
- `logger.warn()` - Advertencias
- `logger.error()` - Errores
- `logger.security()` - Eventos de seguridad

## Monitoreo de Seguridad

El sistema incluye métricas de seguridad accesibles vía:

```
GET /api/v1/health/security-metrics
```

(Requiere autenticación de admin)

## Troubleshooting

### Error: "Migration not found"

Si recibes error de migración no encontrada, verifica:
1. Que el directorio `prisma/migrations` exista
2. Que las migraciones estén sincronizadas con la BD

### Error: "Database drift detected"

Si hay diferencias entre el esquema y la BD:
```bash
# Ver diferencias
npx prisma migrate diff

# Crear migración para resolver drift
npx prisma migrate dev --name fix_drift
```

### Rollback de Migración

Prisma no soporta rollback automático. Para revertir:
1. Crear una nueva migración que revierta los cambios
2. O restaurar desde backup de base de datos
