// src/modules/representatives/representatives.controller.ts
import { logger } from '../../common/services/logger.service';
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../../common/guards/auth.middleware';
import { representativesService } from './representatives.service';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authMiddleware);

/**
 * GET /api/v1/representatives
 * Lista todos los representantes del usuario
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const representatives = await representativesService.listRepresentatives(req.userId!);
    
    res.json({
      success: true,
      data: { representatives },
    });
  } catch (error) {
    logger.error('Error listando representantes:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
    });
  }
});

/**
 * GET /api/v1/representatives/:id
 * Obtiene un representante específico
 */
router.get('/:id',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const representative = await representativesService.getRepresentative(
        req.userId!, 
        req.params.id
      );
      
      if (!representative) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Representante no encontrado' },
        });
      }
      
      res.json({
        success: true,
        data: { representative },
      });
    } catch (error) {
      logger.error('Error obteniendo representante:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

// Validador de teléfono flexible para México
const isValidMexicanPhone = (value: string) => {
  // Remover espacios, guiones, paréntesis
  const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
  // Acepta: +521234567890, 521234567890, 1234567890 (10 dígitos)
  return /^(\+?52)?[1-9]\d{9}$/.test(cleaned);
};

/**
 * POST /api/v1/representatives
 * Crea un nuevo representante
 */
router.post('/',
  body('name').trim().notEmpty().withMessage('Nombre requerido'),
  body('phone').custom(isValidMexicanPhone).withMessage('Teléfono inválido. Debe ser un número mexicano válido'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email inválido'),
  body('relation').trim().notEmpty().withMessage('Relación requerida'),
  body('priority').optional().isInt({ min: 1 }),
  body('isDonorSpokesperson').optional().isBoolean(),
  body('notifyOnEmergency').optional().isBoolean(),
  body('notifyOnAccess').optional().isBoolean(),
  body('canMakeMedicalDecisions').optional().isBoolean(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const representative = await representativesService.createRepresentative(
        req.userId!,
        req.body
      );
      
      res.status(201).json({
        success: true,
        message: 'Representante creado exitosamente',
        data: { representative },
      });
    } catch (error) {
      logger.error('Error creando representante:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * PUT /api/v1/representatives/:id
 * Actualiza un representante
 */
router.put('/:id',
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('phone').optional().custom(isValidMexicanPhone).withMessage('Teléfono inválido'),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('relation').optional().trim().notEmpty(),
  body('priority').optional().isInt({ min: 1 }),
  body('isDonorSpokesperson').optional().isBoolean(),
  body('notifyOnEmergency').optional().isBoolean(),
  body('notifyOnAccess').optional().isBoolean(),
  body('canMakeMedicalDecisions').optional().isBoolean(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const representative = await representativesService.updateRepresentative(
        req.userId!,
        req.params.id,
        req.body
      );
      
      if (!representative) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Representante no encontrado' },
        });
      }
      
      res.json({
        success: true,
        message: 'Representante actualizado exitosamente',
        data: { representative },
      });
    } catch (error) {
      logger.error('Error actualizando representante:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * DELETE /api/v1/representatives/:id
 * Elimina un representante
 */
router.delete('/:id',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const deleted = await representativesService.deleteRepresentative(
        req.userId!,
        req.params.id
      );
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Representante no encontrado' },
        });
      }
      
      res.json({
        success: true,
        message: 'Representante eliminado exitosamente',
      });
    } catch (error) {
      logger.error('Error eliminando representante:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/representatives/reorder
 * Reordena las prioridades de los representantes
 */
router.post('/reorder',
  body('orderedIds').isArray().withMessage('Se requiere un array de IDs'),
  body('orderedIds.*').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const representatives = await representativesService.reorderPriorities(
        req.userId!,
        req.body.orderedIds
      );
      
      res.json({
        success: true,
        message: 'Prioridades actualizadas exitosamente',
        data: { representatives },
      });
    } catch (error) {
      logger.error('Error reordenando representantes:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/representatives/:id/donor-spokesperson
 * Establece el portavoz de donación
 */
router.post('/:id/donor-spokesperson',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const representative = await representativesService.setDonorSpokesperson(
        req.userId!,
        req.params.id
      );
      
      if (!representative) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Representante no encontrado' },
        });
      }
      
      res.json({
        success: true,
        message: 'Portavoz de donación establecido exitosamente',
        data: { representative },
      });
    } catch (error) {
      logger.error('Error estableciendo portavoz:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

export default router;
