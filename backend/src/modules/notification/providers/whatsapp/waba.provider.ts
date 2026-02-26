// src/modules/notification/providers/whatsapp/waba.provider.ts

import axios, { AxiosInstance } from 'axios';
import { IWhatsAppProvider, NotificationParams, SendResult } from '../interfaces';
import { formatPhoneForWABA } from '../phone-utils';
import { getGoogleMapsUrl } from '../../../../common/utils/geolocation';
import { logger } from '../../../../common/services/logger.service';
import config from '../../../../config';

/**
 * Proveedor de WhatsApp via WABA (WhatsApp Business API - Meta Cloud API).
 * Comunicación directa con Meta sin intermediarios.
 */
export class WABAProvider implements IWhatsAppProvider {
  private httpClient: AxiosInstance;
  private phoneNumberId: string;
  private available: boolean;

  constructor() {
    const { phoneNumberId, accessToken, apiVersion } = config.waba;

    this.phoneNumberId = phoneNumberId;
    this.available = !!(phoneNumberId && accessToken);

    this.httpClient = axios.create({
      baseURL: `https://graph.facebook.com/${apiVersion}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (this.available) {
      logger.info('WABAProvider inicializado', { phoneNumberId });
    }
  }

  getName(): string {
    return 'waba';
  }

  isAvailable(): boolean {
    return this.available;
  }

  async send(params: NotificationParams): Promise<SendResult> {
    const { to, patientName, location, type, accessorName, nearestHospital } = params;

    if (!this.available) {
      return { success: false, error: 'WABA no configurado', provider: this.getName() };
    }

    const recipient = formatPhoneForWABA(to);
    const mapsUrl = getGoogleMapsUrl(Number(location.lat), Number(location.lng));

    // Intentar enviar como template primero (funciona fuera de ventana de 24h)
    const templateName = type === 'PANIC'
      ? config.waba.templateEmergency
      : config.waba.templateAccess;

    if (templateName) {
      const templateResult = await this.sendTemplate({
        to: recipient,
        templateName,
        type,
        patientName,
        mapsUrl,
        accessorName,
        nearestHospital,
      });

      if (templateResult.success) {
        return templateResult;
      }

      logger.warn('Template WABA falló, intentando texto libre', {
        template: templateName,
        error: templateResult.error,
      });
    }

    // Fallback a mensaje de texto (solo funciona dentro de ventana de 24h)
    return this.sendText({
      to: recipient,
      type,
      patientName,
      mapsUrl,
      accessorName,
      nearestHospital,
    });
  }

  private async sendTemplate(params: {
    to: string;
    templateName: string;
    type: 'PANIC' | 'QR_ACCESS';
    patientName: string;
    mapsUrl: string;
    accessorName?: string;
    nearestHospital?: string;
  }): Promise<SendResult> {
    const { to, templateName, type, patientName, mapsUrl, accessorName, nearestHospital } = params;

    const components = type === 'PANIC'
      ? [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: mapsUrl },
              { type: 'text', text: nearestHospital || 'No identificado' },
            ],
          },
        ]
      : [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: accessorName || 'personal médico' },
              { type: 'text', text: mapsUrl },
            ],
          },
        ];

    try {
      const response = await this.httpClient.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'es_MX' },
            components,
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info('WhatsApp WABA template enviado', { messageId, template: templateName });
      return { success: true, messageId, provider: this.getName() };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message || 'Error desconocido WABA';
      const errorCode = error.response?.data?.error?.code;
      logger.error('Error WABA template', error, { errorCode: String(errorCode), template: templateName });
      return { success: false, error: errorMsg, provider: this.getName() };
    }
  }

  private async sendText(params: {
    to: string;
    type: 'PANIC' | 'QR_ACCESS';
    patientName: string;
    mapsUrl: string;
    accessorName?: string;
    nearestHospital?: string;
  }): Promise<SendResult> {
    const { to, type, patientName, mapsUrl, accessorName, nearestHospital } = params;

    let body: string;
    if (type === 'PANIC') {
      body = `🚨 EMERGENCIA VIDA\n\n${patientName} activó alerta de pánico.\n\n📍 Ubicación: ${mapsUrl}${nearestHospital ? `\n\n🏥 Hospital cercano: ${nearestHospital}` : ''}`;
    } else {
      body = `⚠️ ALERTA VIDA\n\nAcceso médico a ${patientName} por ${accessorName || 'personal médico'}.\n\n📍 ${mapsUrl}`;
    }

    try {
      const response = await this.httpClient.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: true, body },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      logger.info('WhatsApp WABA texto enviado', { messageId });
      return { success: true, messageId, provider: this.getName() };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error('Error WABA texto', error);
      return { success: false, error: errorMsg, provider: this.getName() };
    }
  }
}
