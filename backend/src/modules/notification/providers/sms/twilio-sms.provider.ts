// src/modules/notification/providers/sms/twilio-sms.provider.ts

import twilio from 'twilio';
import { ISMSProvider, NotificationParams, SendResult } from '../interfaces';
import { formatPhoneForSMS } from '../phone-utils';
import { getGoogleMapsUrl } from '../../../../common/utils/geolocation';
import { logger } from '../../../../common/services/logger.service';
import config from '../../../../config';

/**
 * Proveedor de SMS via Twilio.
 */
export class TwilioSMSProvider implements ISMSProvider {
  private client: twilio.Twilio | null = null;

  constructor() {
    const { sid, token, phone } = config.twilio;
    if (sid && token && phone) {
      try {
        this.client = twilio(sid, token);
        logger.info('TwilioSMSProvider inicializado');
      } catch (error) {
        logger.warn('Error inicializando TwilioSMSProvider', { error: String(error) });
      }
    }
  }

  getName(): string {
    return 'twilio-sms';
  }

  isAvailable(): boolean {
    return this.client !== null && !!config.twilio.phone;
  }

  async send(params: NotificationParams): Promise<SendResult> {
    const { to, patientName, location, type, accessorName, nearestHospital } = params;
    const mapsUrl = getGoogleMapsUrl(location.lat, location.lng);

    let message: string;
    if (type === 'PANIC') {
      message = `EMERGENCIA: ${patientName} activó alerta de pánico. ${mapsUrl}`;
    } else {
      message = `VIDA: Acceso medico a ${patientName} por ${accessorName || 'personal'}. ${mapsUrl}`;
    }

    if (!this.isAvailable()) {
      return { success: false, error: 'Twilio SMS no disponible', provider: this.getName() };
    }

    try {
      const formattedPhone = formatPhoneForSMS(to);
      logger.info('Enviando SMS via Twilio', { to: formattedPhone });

      const result = await this.client!.messages.create({
        body: message,
        from: config.twilio.phone,
        to: formattedPhone,
      });

      logger.info('SMS Twilio enviado', { sid: result.sid, status: result.status });
      return { success: true, messageId: result.sid, provider: this.getName() };
    } catch (error: any) {
      logger.error('Error SMS Twilio', error);
      return { success: false, error: error.message, provider: this.getName() };
    }
  }
}
