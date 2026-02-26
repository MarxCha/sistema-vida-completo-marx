import { Request, Response, NextFunction } from 'express';
import i18next from './config';

/**
 * Middleware that sets req.locale and req.t based on:
 * 1. User's preferredLanguage (from JWT/DB)
 * 2. Accept-Language header
 * 3. Default: 'es'
 */
export function i18nLocaleMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Priority 1: User preference from JWT payload
  const userLang = (req as any).user?.preferredLanguage;

  // Priority 2: Accept-Language header (parsed by i18next-http-middleware)
  const headerLang = req.language;

  // Resolve locale
  const locale = userLang || headerLang || 'es';
  const supportedLocale = ['es', 'en'].includes(locale) ? locale : 'es';

  // Set on request
  (req as any).locale = supportedLocale;

  // Create a fixed t function for this locale
  const t = i18next.getFixedT(supportedLocale);
  (req as any).t = t;

  next();
}
