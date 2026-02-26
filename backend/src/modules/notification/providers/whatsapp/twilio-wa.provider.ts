// src/modules/notification/providers/whatsapp/twilio-wa.provider.ts

import twilio from 'twilio';
import { IWhatsAppProvider, NotificationParams, SendResult } from '../interfaces';
import { formatPhoneForWhatsApp } from '../phone-utils';
import { getGoogleMapsUrl } from '../../../../common/utils/geolocation';
import { logger } from '../../../../common/services/logger.service';
import config from '../../../../config';
import i18next from '../../../../common/i18n/config';

/**
 * Proveedor de WhatsApp via Twilio (legacy).
 * Mantiene la funcionalidad original para rollback instantáneo.
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  private client: twilio.Twilio | null = null;

  constructor() {
    const { sid, token } = config.twilio;
    if (sid && token) {
      try {
        this.client = twilio(sid, token);
        logger.info('TwilioWhatsAppProvider inicializado');
      } catch (error) {
        logger.warn('Error inicializando TwilioWhatsAppProvider', { error: String(error) });
      }
    }
  }

  getName(): string {
    return 'twilio';
  }

  isAvailable(): boolean {
    return this.client !== null && !!config.twilio.whatsappPhone;
  }

  async send(params: NotificationParams): Promise<SendResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Twilio WhatsApp no disponible', provider: this.getName() };
    }

    const { to, patientName, location, type, accessorName, nearestHospital, locale } = params;
    const t = i18next.getFixedT(locale || 'es');

    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const mapsUrl = getGoogleMapsUrl(lat, lng);
    const formattedPhone = formatPhoneForWhatsApp(to);

    let message: string;
    if (type === 'PANIC') {
      if (nearestHospital) {
        message = t('notifications:whatsapp.emergencyWithHospital', { patientName, mapsUrl, hospital: nearestHospital });
      } else {
        message = t('notifications:whatsapp.emergency', { patientName, mapsUrl });
      }
    } else {
      message = t('notifications:whatsapp.access', { patientName, accessorName: accessorName || t('notifications:defaults.medicalStaff'), mapsUrl });
    }

    try {
      logger.info('Enviando WhatsApp via Twilio', { to: formattedPhone });

      let msgOptions: any = {
        from: `whatsapp:${config.twilio.whatsappPhone}`,
        to: `whatsapp:${formattedPhone}`,
      };

      if (type === 'PANIC' && config.twilio.whatsappTemplateId) {
        msgOptions.contentSid = config.twilio.whatsappTemplateId;
        msgOptions.contentVariables = JSON.stringify({
          1: patientName,
          2: mapsUrl,
          3: nearestHospital || t('notifications:defaults.unknownHospital'),
        });
      } else {
        msgOptions.body = message;
      }

      const result = await this.client!.messages.create(msgOptions);
      logger.info('WhatsApp Twilio enviado', { sid: result.sid, status: result.status });
      return { success: true, messageId: result.sid, provider: this.getName() };
    } catch (error: any) {
      logger.error('Error WhatsApp Twilio', error);

      // Retry fallback: si template falla, intentar texto plano
      if (type === 'PANIC' && config.twilio.whatsappTemplateId) {
        try {
          const fallbackResult = await this.client!.messages.create({
            body: message,
            from: `whatsapp:${config.twilio.whatsappPhone}`,
            to: `whatsapp:${formattedPhone}`,
          });
          logger.info('WhatsApp Twilio fallback enviado', { sid: fallbackResult.sid });
          return { success: true, messageId: fallbackResult.sid, provider: this.getName() };
        } catch (fallbackError: any) {
          logger.error('WhatsApp Twilio fallback falló', fallbackError);
        }
      }

      return { success: false, error: error.message, provider: this.getName() };
    }
  }
}
