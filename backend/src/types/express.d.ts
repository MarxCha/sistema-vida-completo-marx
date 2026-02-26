// src/types/express.d.ts
import { User } from '@prisma/client';
import { TFunction } from 'i18next';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        preferredLanguage?: string;
      };
      locale?: string;
      t?: TFunction;
    }
  }
}

export {};
