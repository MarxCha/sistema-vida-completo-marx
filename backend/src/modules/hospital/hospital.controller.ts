// src/modules/hospital/hospital.controller.ts
import { logger } from '../../common/services/logger.service';
import { Router, Request, Response } from 'express';
import { hospitalService } from './hospital.service';
import { isValidCoordinates } from '../../common/utils/geolocation';
import { InstitutionType, AttentionLevel } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/hospitals/nearby
 * Busca hospitales cercanos a una ubicacion
 * Query params:
 *   - lat, lng: coordenadas (requeridos)
 *   - radius: radio en km (default 10)
 *   - limit: maximo resultados (default 5)
 *   - type: tipo de institucion
 *   - level: nivel de atencion (FIRST, SECOND, THIRD)
 *   - emergency: solo con urgencias (true/false)
 *   - h24: solo 24 horas (true/false)
 *   - icu: solo con UCI (true/false)
 *   - trauma: solo con trauma (true/false)
 */
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius, limit, type, level, emergency, h24, icu, trauma } = req.query;

    // Validar coordenadas requeridas
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_COORDINATES',
          message: 'Se requieren las coordenadas (lat, lng)',
        },
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    // Validar que sean coordenadas validas
    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Las coordenadas proporcionadas no son validas',
        },
      });
    }

    // Parsear parametros opcionales
    const radiusKm = radius ? parseFloat(radius as string) : 10;
    const maxResults = limit ? parseInt(limit as string, 10) : 5;
    const institutionType = type as InstitutionType | undefined;
    const attentionLevel = level as AttentionLevel | undefined;

    // Buscar hospitales cercanos
    const hospitals = await hospitalService.findNearbyHospitals({
      latitude,
      longitude,
      radiusKm,
      limit: maxResults,
      type: institutionType,
      attentionLevel,
      requireEmergency: emergency === 'true',
      require24Hours: h24 === 'true',
      requireICU: icu === 'true',
      requireTrauma: trauma === 'true',
    });

    return res.json({
      success: true,
      data: {
        hospitals,
        searchParams: {
          latitude,
          longitude,
          radiusKm,
          limit: maxResults,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error buscando hospitales cercanos:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Error al buscar hospitales cercanos',
      },
    });
  }
});

/**
 * POST /api/v1/hospitals/nearby/smart
 * Busqueda inteligente basada en condiciones del paciente
 * Body: { latitude, longitude, conditions: ["Diabetes", "Cardiopatia"], radiusKm?, limit? }
 */
router.post('/nearby/smart', async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, conditions, radiusKm, limit, prioritizeByCondition } = req.body;

    // Validar coordenadas
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_COORDINATES',
          message: 'Se requieren las coordenadas (latitude, longitude)',
        },
      });
    }

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Las coordenadas proporcionadas no son validas',
        },
      });
    }

    // Validar condiciones
    const patientConditions = Array.isArray(conditions) ? conditions : [];

    // Obtener especialidades requeridas para el usuario
    const requiredSpecialties = hospitalService.getRequiredSpecialtiesForConditions(patientConditions);

    // Buscar hospitales con filtro inteligente
    const hospitals = await hospitalService.findNearbyHospitalsForConditions({
      latitude,
      longitude,
      patientConditions,
      radiusKm: radiusKm || 15,
      limit: limit || 10,
      prioritizeByCondition: prioritizeByCondition !== false,
    });

    return res.json({
      success: true,
      data: {
        hospitals,
        analysis: {
          patientConditions,
          requiredSpecialties,
          totalFound: hospitals.length,
        },
        searchParams: {
          latitude,
          longitude,
          radiusKm: radiusKm || 15,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error en busqueda inteligente de hospitales:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SMART_SEARCH_ERROR',
        message: 'Error en la busqueda inteligente de hospitales',
      },
    });
  }
});

/**
 * GET /api/v1/hospitals/conditions
 * Lista las condiciones medicas conocidas para el filtro
 */
router.get('/conditions', async (_req: Request, res: Response) => {
  try {
    const conditions = hospitalService.getKnownConditions();

    return res.json({
      success: true,
      data: {
        conditions,
        total: conditions.length,
      },
    });
  } catch (error: any) {
    logger.error('Error obteniendo condiciones:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'CONDITIONS_ERROR',
        message: 'Error al obtener las condiciones medicas',
      },
    });
  }
});

/**
 * GET /api/v1/hospitals/:id
 * Obtiene un hospital por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const hospital = await hospitalService.findById(id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Hospital no encontrado',
        },
      });
    }

    return res.json({
      success: true,
      data: { hospital },
    });
  } catch (error: any) {
    logger.error('Error obteniendo hospital:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Error al obtener el hospital',
      },
    });
  }
});

/**
 * GET /api/v1/hospitals
 * Lista todos los hospitales con filtros opcionales
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { state, city, type } = req.query;

    const hospitals = await hospitalService.listAll({
      state: state as string | undefined,
      city: city as string | undefined,
      type: type as InstitutionType | undefined,
    });

    return res.json({
      success: true,
      data: {
        hospitals,
        total: hospitals.length,
      },
    });
  } catch (error: any) {
    logger.error('Error listando hospitales:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Error al listar hospitales',
      },
    });
  }
});

export default router;
