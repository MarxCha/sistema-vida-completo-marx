-- Script para agregar Carlos Amador como representante del usuario Carlos García
-- Ejecutar en la base de datos de producción

-- Primero, encontrar el ID del usuario Carlos García
DO $$
DECLARE
    carlos_garcia_id UUID;
    carlos_amador_id UUID;
BEGIN
    -- Buscar al usuario Carlos García Rodríguez
    SELECT id INTO carlos_garcia_id 
    FROM "User" 
    WHERE email = 'demo@sistemavida.mx' 
    LIMIT 1;
    
    IF carlos_garcia_id IS NULL THEN
        RAISE EXCEPTION 'Usuario Carlos García no encontrado';
    END IF;
    
    -- Verificar si Carlos Amador ya existe como representante
    SELECT id INTO carlos_amador_id
    FROM "Representative" 
    WHERE "userId" = carlos_garcia_id 
    AND email = 'carlos_amador@outlook.com'
    LIMIT 1;
    
    IF carlos_amador_id IS NOT NULL THEN
        RAISE NOTICE 'Carlos Amador ya existe como representante';
    ELSE
        -- Crear a Carlos Amador como representante
        INSERT INTO "Representative" (
            id,
            "userId",
            name,
            email,
            phone,
            relation,
            priority,
            "isDonorSpokesperson",
            "notifyOnEmergency",
            "notifyOnAccess",
            "createdAt",
            "updatedAt"
        ) VALUES (
            gen_random_uuid(),
            carlos_garcia_id,
            'Carlos Amador',
            'carlos_amador@outlook.com',
            '+52 55 7777 8888',
            'Representante Legal',
            5,
            false,
            true,
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Carlos Amador ha sido agregado como representante exitosamente';
    END IF;
END $$;

-- Verificar los representantes del usuario Carlos García
SELECT 
    r.name,
    r.email,
    r.phone,
    r.relation,
    r.priority,
    r."notifyOnEmergency",
    r."notifyOnAccess",
    r."createdAt"
FROM "Representative" r
JOIN "User" u ON r."userId" = u.id
WHERE u.email = 'demo@sistemavida.mx'
ORDER BY r.priority;