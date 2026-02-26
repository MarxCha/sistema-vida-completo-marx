// src/modules/auth/webauthn.controller.ts
import { logger } from '../../common/services/logger.service';
import { Router, Request, Response } from 'express';
import { webAuthnService } from './webauthn.service';
import { authMiddleware } from '../../common/guards/auth.middleware';
import { generateTokens } from '../../common/utils/jwt';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const router = Router();

/**
 * POST /auth/webauthn/register/options
 * Genera opciones para registrar una nueva credencial biométrica
 * Requiere autenticación (el usuario debe estar logueado)
 */
router.post('/register/options', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const options = await webAuthnService.generateRegistrationOptions(userId);

    res.json({
      success: true,
      data: options,
    });
  } catch (error) {
    logger.error('Error generando opciones de registro WebAuthn:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.errorGeneratingOptions'),
    });
  }
});

/**
 * POST /auth/webauthn/register/verify
 * Verifica y guarda una nueva credencial biométrica
 * Requiere autenticación
 */
router.post('/register/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { credential, deviceName } = req.body as {
      credential: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: req.t!('api:auth.credentialRequired'),
      });
    }

    const result = await webAuthnService.verifyRegistration(userId, credential, deviceName);

    res.json({
      success: true,
      data: result,
      message: req.t!('api:auth.biometricRegistered'),
    });
  } catch (error) {
    logger.error('Error verificando registro WebAuthn:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.errorVerifyingCredential'),
    });
  }
});

/**
 * POST /auth/webauthn/login/options
 * Genera opciones para autenticación biométrica
 * NO requiere autenticación (el usuario aún no está logueado)
 */
router.post('/login/options', async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({
        success: false,
        error: req.t!('api:auth.emailRequired'),
      });
    }

    const { options, userId } = await webAuthnService.generateAuthenticationOptions(email);

    res.json({
      success: true,
      data: {
        options,
        userId, // Necesario para verificar después
      },
    });
  } catch (error) {
    logger.error('Error generando opciones de autenticación WebAuthn:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.errorGeneratingOptions'),
    });
  }
});

/**
 * POST /auth/webauthn/login/verify
 * Verifica la autenticación biométrica y retorna tokens JWT
 * NO requiere autenticación
 */
router.post('/login/verify', async (req: Request, res: Response) => {
  try {
    const { userId, credential } = req.body as {
      userId: string;
      credential: AuthenticationResponseJSON;
    };

    if (!userId || !credential) {
      return res.status(400).json({
        success: false,
        error: req.t!('api:auth.userIdAndCredentialRequired'),
      });
    }

    const result = await webAuthnService.verifyAuthentication(userId, credential);

    if (!result.verified) {
      return res.status(401).json({
        success: false,
        error: req.t!('api:auth.biometricAuthFailed'),
      });
    }

    // Generar tokens JWT
    const tokens = generateTokens({
      id: result.user.id,
      email: result.user.email,
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        ...tokens,
      },
      message: req.t!('api:auth.biometricLoginSuccess'),
    });
  } catch (error) {
    logger.error('Error verificando autenticación WebAuthn:', error);
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.authFailed'),
    });
  }
});

/**
 * GET /auth/webauthn/credentials
 * Lista las credenciales biométricas del usuario
 * Requiere autenticación
 */
router.get('/credentials', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const credentials = await webAuthnService.listCredentials(userId);

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    logger.error('Error listando credenciales WebAuthn:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.errorListingCredentials'),
    });
  }
});

/**
 * DELETE /auth/webauthn/credentials/:id
 * Elimina una credencial biométrica
 * Requiere autenticación
 */
router.delete('/credentials/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const credentialId = req.params.id;

    await webAuthnService.deleteCredential(userId, credentialId);

    res.json({
      success: true,
      message: req.t!('api:auth.credentialDeleted'),
    });
  } catch (error) {
    logger.error('Error eliminando credencial WebAuthn:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : req.t!('api:auth.errorDeletingCredential'),
    });
  }
});

/**
 * GET /auth/webauthn/check/:email
 * Verifica si un usuario tiene credenciales biométricas registradas
 * NO requiere autenticación (para mostrar opción en login)
 */
router.get('/check/:email', async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.email);

    // Intentar obtener opciones de autenticación
    // Si el usuario no tiene credenciales, lanzará un error
    try {
      await webAuthnService.generateAuthenticationOptions(email);
      res.json({
        success: true,
        data: { hasBiometricCredentials: true },
      });
    } catch {
      res.json({
        success: true,
        data: { hasBiometricCredentials: false },
      });
    }
  } catch (error) {
    res.json({
      success: true,
      data: { hasBiometricCredentials: false },
    });
  }
});

export default router;
