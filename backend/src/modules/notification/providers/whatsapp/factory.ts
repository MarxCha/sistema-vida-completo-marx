// src/modules/notification/providers/whatsapp/factory.ts

import { IWhatsAppProvider, NotificationParams, SendResult } from '../interfaces';
import { WABAProvider } from './waba.provider';
import { TwilioWhatsAppProvider } from './twilio-wa.provider';
import { logger } from '../../../../common/services/logger.service';
import config from '../../../../config';

/**
 * Factory + Decorator para WhatsApp providers.
 * Soporta feature flags y fallback automático entre WABA y Twilio.
 */
export class WhatsAppProviderFactory {
  /**
   * Crea el provider apropiado basado en WHATSAPP_PROVIDER env var.
   * Si fallbackEnabled=true, envuelve en un decorator con fallback.
   */
  static create(): IWhatsAppProvider {
    const providerName = config.waba.provider;
    const fallbackEnabled = config.waba.fallbackToTwilio;

    logger.info('WhatsApp provider configurado', { provider: providerName, fallback: fallbackEnabled });

    const primary = providerName === 'waba'
      ? new WABAProvider()
      : new TwilioWhatsAppProvider();

    if (fallbackEnabled && providerName === 'waba') {
      const fallback = new TwilioWhatsAppProvider();
      return new WhatsAppWithFallback(primary, fallback);
    }

    return primary;
  }
}

/**
 * Decorator que agrega fallback automático.
 * Si el provider primario falla, intenta con el secundario.
 */
class WhatsAppWithFallback implements IWhatsAppProvider {
  constructor(
    private primary: IWhatsAppProvider,
    private fallback: IWhatsAppProvider,
  ) {}

  getName(): string {
    return `${this.primary.getName()}+fallback:${this.fallback.getName()}`;
  }

  isAvailable(): boolean {
    return this.primary.isAvailable() || this.fallback.isAvailable();
  }

  async send(params: NotificationParams): Promise<SendResult> {
    if (this.primary.isAvailable()) {
      const result = await this.primary.send(params);
      if (result.success) {
        return result;
      }

      logger.warn('WhatsApp primary falló, usando fallback', {
        primary: this.primary.getName(),
        fallback: this.fallback.getName(),
        error: result.error,
      });
    }

    if (this.fallback.isAvailable()) {
      return this.fallback.send(params);
    }

    return {
      success: false,
      error: 'Ningún provider de WhatsApp disponible',
      provider: this.getName(),
    };
  }
}
