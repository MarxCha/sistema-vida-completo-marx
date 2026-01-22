// src/common/utils/jwt.ts
import jwt from 'jsonwebtoken';
import config from '../../config';

interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Genera tokens de acceso y refresh para un usuario
 */
export function generateTokens(user: { id: string; email: string }): AuthTokens {
  const accessPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    type: 'access',
  };

  const refreshPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutos en segundos
  };
}

/**
 * Verifica un token JWT
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch {
    return null;
  }
}
