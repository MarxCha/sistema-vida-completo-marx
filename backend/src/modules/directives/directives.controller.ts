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
      error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
      error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
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
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
        message: req.t('api:directives.draftCreated'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error creando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
        message: req.t('api:directives.documentUploaded'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error cargando documento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
        });
      }

      res.json({
        success: true,
        message: req.t('api:directives.draftUpdated'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error actualizando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
        });
      }

      res.json({
        success: true,
        message: req.t('api:directives.validated'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error validando directiva:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
        });
      }

      res.json({
        success: true,
        message: req.t('api:directives.sealed'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error sellando documento:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
        });
      }

      res.json({
        success: true,
        message: req.t('api:directives.revoked'),
        data: { directive },
      });
    } catch (error) {
      logger.error('Error revocando directiva:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
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
          error: { code: 'NOT_FOUND', message: req.t('api:directives.notFound') },
        });
      }

      res.json({
        success: true,
        message: req.t('api:directives.draftDeleted'),
      });
    } catch (error) {
      logger.error('Error eliminando borrador:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: req.t('api:generic.serverError') },
      });
    }
  }
);

export default router;
