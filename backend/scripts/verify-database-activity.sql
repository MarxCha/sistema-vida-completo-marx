-- Script SQL para verificar inserciones reales en la base de datos
-- Este script consulta directamente la BD para confirmar que las APIs están escribiendo

-- Conteo de usuarios por fecha de creación
SELECT 
  DATE_TRUNC('day', "createdAt") as fecha,
  COUNT(*) as usuarios_nuevos,
  COUNT(CASE WHEN "updatedAt" > "createdAt" THEN 1 END) as usuarios_actualizados
FROM "User" 
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY fecha DESC;

-- Conteo de perfiles médicos creados/actualizados
SELECT 
  COUNT(*) as total_perfiles,
  COUNT(CASE WHEN "createdAt" = "updatedAt" THEN 1 END) como_nuevos,
  COUNT(CASE WHEN "updatedAt" > "createdAt" THEN 1 END) como_actualizados,
  COUNT(CASE WHEN "allergiesEnc" IS NOT NULL THEN 1 END) con_alergias,
  COUNT(CASE WHEN "conditionsEnc" IS NOT NULL THEN 1 END) con_condiciones
FROM "PatientProfile"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Verificación de representantes creados
SELECT 
  r.relation,
  COUNT(*) as total,
  COUNT(CASE WHEN r."notifyOnEmergency" = true THEN 1 END) notificacion_emergencia,
  COUNT(CASE WHEN r."notifyOnAccess" = true THEN 1 END) notificacion_acceso,
  COUNT(CASE WHEN r.email IS NOT NULL THEN 1 END) con_email
FROM "Representative" r
JOIN "User" u ON r."userId" = u.id
WHERE r."createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY r.relation
ORDER BY total DESC;

-- Verificación de directivas de voluntad anticipada
SELECT 
  type,
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) ultimas_24h
FROM "AdvanceDirective"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY type, status
ORDER BY "createdAt" DESC;

-- Verificación de documentos médicos
SELECT 
  category,
  COUNT(*) as total,
  SUM("fileSize") / 1024 / 1024 as tamano_mb,
  COUNT(CASE WHEN "fileUrl" LIKE 's3://%' THEN 1 END) en_s3,
  COUNT(CASE WHEN "encryptionKey" IS NOT NULL THEN 1 END) encriptados
FROM "MedicalDocument"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY total DESC;

-- Verificación de accesos de emergencia
SELECT 
  DATE_TRUNC('hour', "createdAt") as hora,
  COUNT(*) as accesos,
  COUNT(DISTINCT "userId") as usuarios_unicos,
  COUNT(CASE WHEN "accessorInstitution" IS NOT NULL THEN 1 END) con_institucion
FROM "EmergencyAccess"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', "createdAt")
ORDER BY hora DESC
LIMIT 24;

-- Verificación de intentos de acceso (fallidos y exitosos)
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '1 hour' THEN 1 END) ultima_hora
FROM "EmergencyAccess"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Verificación de notificaciones enviadas
SELECT 
  channel,
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '1 hour' THEN 1 END) ultima_hora
FROM "Notification"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY channel, status
ORDER BY total DESC;

-- Verificación de alertas de pánico
SELECT 
  status,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (resolved_at - "createdAt"))/60) as minutos_promedio_resolucion
FROM "PanicAlert"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY status;

-- Verificación de sesiones activas
SELECT 
  COUNT(*) as total_sesiones,
  COUNT(CASE WHEN "expiresAt" > NOW() THEN 1 END) activas,
  COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '24 hours' THEN 1 END) ultimas_24h
FROM "UserSession"
WHERE "createdAt" >= NOW() - INTERVAL '7 days';

-- Verificación de logs de auditoría por acción
SELECT 
  action,
  COUNT(*) as total,
  COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '1 hour' THEN 1 END) ultima_hora,
  COUNT(DISTINCT "userId") as usuarios_unicos
FROM "AuditLog"
WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY total DESC;

-- Resumen general de la última hora
SELECT 
  'USUARIOS' as tipo,
  COUNT(*) as total_ultima_hora
FROM "User" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'PERFILES' as tipo,
  COUNT(*) as total_ultima_hora
FROM "PatientProfile" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'REPRESENTANTES' as tipo,
  COUNT(*) as total_ultima_hora
FROM "Representative" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'DIRECTIVAS' as tipo,
  COUNT(*) as total_ultima_hora
FROM "AdvanceDirective" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'DOCUMENTOS' as tipo,
  COUNT(*) as total_ultima_hora
FROM "MedicalDocument" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'ACCESOS_EMERGENCIA' as tipo,
  COUNT(*) as total_ultima_hora
FROM "EmergencyAccess" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'NOTIFICACIONES' as tipo,
  COUNT(*) as total_ultima_hora
FROM "Notification" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'

ORDER BY total_ultima_hora DESC;