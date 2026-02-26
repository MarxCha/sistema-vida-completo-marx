-- Migración: Agregar WHATSAPP al enum NotificationChannel
-- Fecha: 2026-02-26
-- Razón: Migración de Twilio a WABA requiere canal explícito para WhatsApp

-- Agregar el nuevo valor al enum (IF NOT EXISTS para idempotencia)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'WHATSAPP'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationChannel')
  ) THEN
    ALTER TYPE "NotificationChannel" ADD VALUE 'WHATSAPP';
  END IF;
END
$$;

-- Verificar
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationChannel');
