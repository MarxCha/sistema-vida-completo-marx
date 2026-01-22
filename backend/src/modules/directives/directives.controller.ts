// src/modules/directives/directives.controller.ts
import { logger } from '../../common/services/logger.service';
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../../common/guards/auth.middleware';
import { directivesService } from './directives.service';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authMiddleware);

/**
 * GET /api/v1/directives
 * Lista todas las directivas del usuario
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const directives = await directivesService.listDirectives(req.userId!);
    
    res.json({
      success: true,
      data: { directives },
    });
  } catch (error) {
    logger.error('Error listando directivas:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
    });
  }
});

/**
 * GET /api/v1/directives/active
 * Obtiene la directiva activa del usuario
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const directive = await directivesService.getActiveDirective(req.userId!);
    
    res.json({
      success: true,
      data: { 
        hasActiveDirective: !!directive,
        directive 
      },
    });
  } catch (error) {
    logger.error('Error obteniendo directiva activa:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
    });
  }
});

/**
 * GET /api/v1/directives/:id
 * Obtiene una directiva específica
 */
router.get('/:id',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.getDirective(req.userId!, req.params.id);
      
      if (!directive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Directiva no encontrada' },
        });
      }
      
      res.json({
        success: true,
        data: { directive },
      });
    } catch (error) {
      logger.error('Error obteniendo directiva:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/directives/draft
 * Crea un borrador de voluntad anticipada
 */
router.post('/draft',
  body('acceptsCPR').optional().isBoolean(),
  body('acceptsIntubation').optional().isBoolean(),
  body('acceptsDialysis').optional().isBoolean(),
  body('acceptsTransfusion').optional().isBoolean(),
  body('acceptsArtificialNutrition').optional().isBoolean(),
  body('palliativeCareOnly').optional().isBoolean(),
  body('additionalNotes').optional().isString().isLength({ max: 5000 }),
  body('originState').optional().isString().isLength({ max: 50 }),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.createDraft(req.userId!, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Borrador de voluntad anticipada creado exitosamente',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error creando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/directives/upload
 * Sube un documento notarizado existente
 */
router.post('/upload',
  body('documentUrl').isURL().withMessage('URL del documento inválido'),
  body('originalFileName').isString().notEmpty(),
  body('originState').optional().isString(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.uploadDocument(req.userId!, {
        documentUrl: req.body.documentUrl,
        originalFileName: req.body.originalFileName,
        originState: req.body.originState,
      });
      
      res.status(201).json({
        success: true,
        message: 'Documento de voluntad anticipada cargado exitosamente',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error cargando documento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * PUT /api/v1/directives/:id
 * Actualiza un borrador existente
 */
router.put('/:id',
  param('id').isUUID(),
  body('acceptsCPR').optional().isBoolean(),
  body('acceptsIntubation').optional().isBoolean(),
  body('acceptsDialysis').optional().isBoolean(),
  body('acceptsTransfusion').optional().isBoolean(),
  body('acceptsArtificialNutrition').optional().isBoolean(),
  body('palliativeCareOnly').optional().isBoolean(),
  body('additionalNotes').optional().isString().isLength({ max: 5000 }),
  body('originState').optional().isString(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.updateDraft(req.userId!, req.params.id, req.body);
      
      if (!directive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Borrador no encontrado o no se puede modificar' },
        });
      }
      
      res.json({
        success: true,
        message: 'Borrador actualizado exitosamente',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error actualizando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/directives/:id/validate
 * Valida una directiva (la activa)
 */
router.post('/:id/validate',
  param('id').isUUID(),
  body('method').isIn(['EMAIL', 'SMS']).withMessage('Método debe ser EMAIL o SMS'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.validateDirective(
        req.userId!, 
        req.params.id, 
        req.body.method
      );
      
      if (!directive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Directiva no encontrada o no se puede validar' },
        });
      }
      
      res.json({
        success: true,
        message: 'Directiva validada y activada exitosamente',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error validando directiva:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/directives/:id/seal
 * Solicita sellado NOM-151
 */
router.post('/:id/seal',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.requestNOM151Seal(req.userId!, req.params.id);
      
      if (!directive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Directiva no encontrada o no tiene documento para sellar' },
        });
      }
      
      res.json({
        success: true,
        message: 'Documento sellado con constancia NOM-151',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error sellando documento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * POST /api/v1/directives/:id/revoke
 * Revoca una directiva
 */
router.post('/:id/revoke',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const directive = await directivesService.revokeDirective(req.userId!, req.params.id);
      
      if (!directive) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Directiva no encontrada o ya está revocada' },
        });
      }
      
      res.json({
        success: true,
        message: 'Directiva revocada exitosamente',
        data: { directive },
      });
    } catch (error) {
      logger.error('Error revocando directiva:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

/**
 * DELETE /api/v1/directives/:id
 * Elimina un borrador
 */
router.delete('/:id',
  param('id').isUUID(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const deleted = await directivesService.deleteDirective(req.userId!, req.params.id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Borrador no encontrado o no se puede eliminar' },
        });
      }
      
      res.json({
        success: true,
        message: 'Borrador eliminado exitosamente',
      });
    } catch (error) {
      logger.error('Error eliminando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Error interno del servidor' },
      });
    }
  }
);

export default router;
