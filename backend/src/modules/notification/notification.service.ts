// src/modules/notification/notification.service.ts
import twilio from 'twilio';
import { Resend } from 'resend';
import { PrismaClient, NotificationType, NotificationChannel, NotificationStatus } from '@prisma/client';
import config from '../../config';
import { getGoogleMapsUrl } from '../../common/utils/geolocation';
import { logger } from '../../common/services/logger.service';

const prisma = new PrismaClient();

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface NotificationResult {
  representativeId: string;
  name: string;
  phone: string;
  email?: string;
  smsStatus: 'sent' | 'failed' | 'skipped';
  whatsappStatus: 'sent' | 'failed' | 'skipped';
  emailStatus: 'sent' | 'failed' | 'skipped';
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private resend: Resend | null = null;
  private isSimulationMode: boolean = false;

  constructor() {
    this.initializeTwilio();
    this.initializeEmail();
  }

  private initializeTwilio(): void {
    const { sid, token, phone } = config.twilio;
    const missing: string[] = [];

    if (!sid) missing.push('TWILIO_ACCOUNT_SID');
    if (!token) missing.push('TWILIO_AUTH_TOKEN');
    if (!phone) missing.push('TWILIO_PHONE_NUMBER');

    if (missing.length === 0) {
      try {
        this.twilioClient = twilio(sid, token);
        logger.info('✅ Twilio inicializado correctamente');
      } catch (error) {
        logger.error('❌ Error inicializando Twilio', { error: String(error) });
        this.isSimulationMode = true;
      }
    } else {
      logger.warn(`⚠️ Credenciales de Twilio incompletas. Faltan: ${missing.join(', ')}`);
      logger.warn('⚠️ Usando MODO SIMULACIÓN para SMS y WhatsApp');
      this.isSimulationMode = true;
    }
  }

  private initializeEmail(): void {
    const { resendApiKey } = config.email;

    if (resendApiKey) {
      try {
        this.resend = new Resend(resendApiKey);
        logger.info('✅ Resend inicializado correctamente');
      } catch (error) {
        logger.error('❌ Error inicializando Resend', { error: String(error) });
      }
    } else {
      logger.warn('⚠️ RESEND_API_KEY no configurada. Usando MODO SIMULACIÓN para Email.');
    }
  }

  /**
   * Verifica la configuración actual de notificaciones
   */
  validateConfiguration(): {
    twilio: { configured: boolean; missing: string[] };
    email: { configured: boolean; missing: string[] };
    simulationMode: boolean;
  } {
    const twilioMissing: string[] = [];
    if (!config.twilio.sid) twilioMissing.push('TWILIO_ACCOUNT_SID');
    if (!config.twilio.token) twilioMissing.push('TWILIO_AUTH_TOKEN');
    if (!config.twilio.phone) twilioMissing.push('TWILIO_PHONE_NUMBER');

    const emailMissing: string[] = [];
    if (!config.email.resendApiKey) emailMissing.push('RESEND_API_KEY');

    return {
      twilio: {
        configured: twilioMissing.length === 0,
        missing: twilioMissing
      },
      email: {
        configured: emailMissing.length === 0,
        missing: emailMissing
      },
      simulationMode: this.isSimulationMode || !this.resend
    };
  }

  /**
   * Envia SMS de emergencia via Twilio
   */
  async sendEmergencySMS(params: {
    to: string;
    patientName: string;
    location: { lat: number; lng: number };
    type: 'PANIC' | 'QR_ACCESS';
    accessorName?: string;
    nearestHospital?: string;
  }): Promise<SMSResult> {
    const { to, patientName, location, type, accessorName, nearestHospital } = params;

    // Construir mensaje segun el tipo
    let message: string;
    const mapsUrl = getGoogleMapsUrl(location.lat, location.lng);

    // Mensajes cortos para cuentas trial de Twilio (max 160 chars)
    if (type === 'PANIC') {
      message = `EMERGENCIA: ${patientName} activo alerta de panico. ${mapsUrl}`;
    } else {
      message = `VIDA: Acceso medico a ${patientName} por ${accessorName || 'personal'}. ${mapsUrl}`;
    }

    // Modo simulacion
    if (this.isSimulationMode || !this.twilioClient) {
      logger.info('=== SMS SIMULADO ===');
      logger.info(`Para: ${to}`);
      logger.info(`Mensaje: ${message}`);
      logger.info('====================');

      // Registrar en BD como simulado
      await this.saveNotification({
        phone: to,
        type: type === 'PANIC' ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.SMS,
        body: message,
        status: NotificationStatus.SENT,
        metadata: { simulated: true, location },
      });

      return { success: true, messageId: `SIM-${Date.now()}` };
    }

    // Envio real via Twilio
    try {
      const formattedPhone = this.formatPhoneNumber(to);
      logger.info(`📱 Enviando SMS a: ${formattedPhone} (original: ${to})`);
      logger.info(`📱 Twilio FROM: ${config.twilio.phone}`);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: config.twilio.phone,
        to: formattedPhone,
      });

      logger.info(`✅ SMS enviado exitosamente! SID: ${result.sid}, Status: ${result.status}`);

      // Registrar en BD
      await this.saveNotification({
        phone: to,
        type: type === 'PANIC' ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.SMS,
        body: message,
        status: NotificationStatus.SENT,
        metadata: { twilioSid: result.sid, location },
      });

      return { success: true, messageId: result.sid };
    } catch (error: any) {
      logger.error('❌ Error enviando SMS:', error.message);
      logger.error('❌ Error code:', error.code);
      logger.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Registrar fallo en BD
      await this.saveNotification({
        phone: to,
        type: type === 'PANIC' ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.SMS,
        body: message,
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
        metadata: { location },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Envia WhatsApp de emergencia via Twilio
   */
  async sendEmergencyWhatsApp(params: {
    to: string;
    patientName: string;
    location: { lat: number; lng: number };
    type: 'PANIC' | 'QR_ACCESS';
    accessorName?: string;
    nearestHospital?: string;
  }): Promise<WhatsAppResult> {
    const { to, patientName, location, type, accessorName, nearestHospital } = params;

    // Asegurar que las coordenadas son números válidos
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const mapsUrl = getGoogleMapsUrl(lat, lng);

    // Mensaje corto para WhatsApp
    let message: string;
    if (type === 'PANIC') {
      message = `🚨 *EMERGENCIA VIDA*\n\n${patientName} activó alerta de pánico.\n\n📍 Ubicación: ${mapsUrl}${nearestHospital ? `\n\n🏥 Hospital cercano: ${nearestHospital}` : ''}`;
    } else {
      message = `⚠️ *ALERTA VIDA*\n\nAcceso médico a ${patientName} por ${accessorName || 'personal médico'}.\n\n📍 ${mapsUrl}`;
    }

    // Modo simulación
    if (this.isSimulationMode || !this.twilioClient) {
      logger.info('=== WHATSAPP SIMULADO ===');
      logger.info(`Para: ${to}`);
      logger.info(`Mensaje: ${message}`);
      logger.info('=========================');
      return { success: true, messageId: `SIM-WA-${Date.now()}` };
    }

    try {
      // WhatsApp en México requiere +521 para móviles
      const formattedPhone = this.formatPhoneNumberForWhatsApp(to);
      logger.info(`📲 Enviando WhatsApp a: whatsapp:${formattedPhone}`);

      // ESTRATEGIA: Intentar con Template si está configurado
      // Si falla, caer en fallback de texto plano

      let contentSid: string | undefined;
      let contentVariables: string | undefined;

      if (type === 'PANIC') {
        contentSid = config.twilio.whatsappTemplateId;
        contentVariables = JSON.stringify({
          '1': patientName,
          '2': mapsUrl,
          '3': nearestHospital || 'No identificado'
        });
      } else if (type === 'QR_ACCESS') {
        contentSid = config.twilio.whatsappAccessTemplateId;
        contentVariables = JSON.stringify({
          '1': patientName,
          '2': accessorName || 'Personal Médico',
          '3': mapsUrl
        });
      }

      if (contentSid) {
        try {
          logger.info(`📨 Intentando WhatsApp con Template: ${contentSid} (Tipo: ${type})`);

          const messageOptions: any = {
            from: `whatsapp:${config.twilio.whatsappPhone}`,
            to: `whatsapp:${formattedPhone}`,
            contentSid: contentSid,
            contentVariables: contentVariables,
          };

          // Si hay un Messaging Service SID configurado, usarlo para mayor confiabilidad
          if (config.twilio.messagingServiceSid) {
            messageOptions.messagingServiceSid = config.twilio.messagingServiceSid;
            // Cuando se usa messagingServiceSid, Twilio prefiere que no se envíe 'from' explícito 
            // a menos que se quiera forzar un número específico.
            delete messageOptions.from;
          }

          const templateResult = await this.twilioClient.messages.create(messageOptions);
          logger.info(`✅ WhatsApp (template) enviado! SID: ${templateResult.sid}, Status: ${templateResult.status}`);
          return { success: true, messageId: templateResult.sid };
        } catch (templateError: any) {
          logger.warn(`⚠️ WhatsApp template falló (${templateError.code}): ${templateError.message}`);
          logger.info('📨 Intentando fallback con texto plano...');
        }
      }

      // Si no hay template o el template falló, intentar texto plano
      logger.info('📨 Enviando WhatsApp con texto plano (fallback o sin template)...');

      const plainTextOptions: any = {
        body: message,
        from: `whatsapp:${config.twilio.whatsappPhone}`,
        to: `whatsapp:${formattedPhone}`,
      };

      if (config.twilio.messagingServiceSid) {
        plainTextOptions.messagingServiceSid = config.twilio.messagingServiceSid;
        delete plainTextOptions.from;
      }

      const textResult = await this.twilioClient.messages.create(plainTextOptions);
      logger.info(`✅ WhatsApp (texto) enviado! SID: ${textResult.sid}, Status: ${textResult.status}`);
      return { success: true, messageId: textResult.sid };

    } catch (error: any) {
      logger.error('❌ Error fatal enviando WhatsApp:', {
        message: error.message,
        code: error.code,
        moreInfo: error.moreInfo
      });
      return { success: false, error: `${error.message} (${error.code})` };
    }
  }

  /**
   * Envia email de emergencia
   */
  async sendEmergencyEmail(params: {
    to: string;
    patientName: string;
    location: { lat: number; lng: number };
    type: 'PANIC' | 'QR_ACCESS';
    accessorName?: string;
    nearestHospital?: string;
    nearbyHospitals?: Array<{ name: string; distance: number; phone?: string }>;
  }): Promise<EmailResult> {
    const { to, patientName, location, type, accessorName, nearestHospital, nearbyHospitals } = params;

    const mapsUrl = getGoogleMapsUrl(location.lat, location.lng);
    const isPanic = type === 'PANIC';

    const subject = isPanic
      ? `🚨 ALERTA EMERGENCIA - ${patientName} ha activado el botón de pánico`
      : `⚠️ ALERTA VIDA - Acceso a información médica de ${patientName}`;

    // Construir lista de hospitales para el email
    let hospitalsHtml = '';
    if (nearbyHospitals && nearbyHospitals.length > 0) {
      hospitalsHtml = `
        <h3 style="color: #0284c7; margin-top: 20px;">Hospitales Cercanos:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${nearbyHospitals.map(h => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px 0;">
                <strong>${h.name}</strong><br>
                <span style="color: #6b7280; font-size: 14px;">A ${h.distance.toFixed(1)} km</span>
              </td>
              <td style="text-align: right; padding: 10px 0;">
                ${h.phone ? `<a href="tel:${h.phone}" style="background: #dc2626; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none;">Llamar</a>` : ''}
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="background: ${isPanic ? '#dc2626' : '#f59e0b'}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${isPanic ? '🚨 EMERGENCIA' : '⚠️ ALERTA VIDA'}</h1>
          </div>

          <!-- Content -->
          <div style="padding: 24px;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
              ${isPanic
        ? `<strong>${patientName}</strong> ha activado el botón de pánico y necesita ayuda inmediata.`
        : `Se ha accedido a la información médica de <strong>${patientName}</strong>.`
      }
            </p>

            ${!isPanic && accessorName ? `
              <p style="color: #6b7280;">
                <strong>Acceso realizado por:</strong> ${accessorName}
              </p>
            ` : ''}

            <!-- Location -->
            <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 10px 0;">📍 Ubicación</h3>
              <a href="${mapsUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Ver en Google Maps
              </a>
              ${nearestHospital ? `<p style="color: #6b7280; margin-top: 10px;">Hospital más cercano: <strong>${nearestHospital}</strong></p>` : ''}
            </div>

            ${hospitalsHtml}

            <!-- Footer -->
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                Este mensaje fue enviado automáticamente por el Sistema VIDA.<br>
                ${new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Modo simulación si no hay Resend configurado
    if (!this.resend) {
      logger.info('=== EMAIL SIMULADO ===');
      logger.info(`Para: ${to}`);
      logger.info(`Asunto: ${subject}`);
      logger.info('======================');

      await this.saveNotification({
        email: to,
        type: isPanic ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject,
        body: html,
        status: NotificationStatus.SENT,
        metadata: { simulated: true, location },
      });

      return { success: true, messageId: `SIM-EMAIL-${Date.now()}` };
    }

    // Envío real via Resend
    try {
      logger.info(`📧 Enviando email a: ${to}`);
      logger.info(`📧 From: ${config.email.from}`);

      const result = await this.resend.emails.send({
        from: config.email.from,
        to: [to],
        subject,
        html,
      });

      logger.info('📧 Resend response', { result });

      if (result.error) {
        throw new Error(result.error.message);
      }

      logger.info(`✅ Email enviado exitosamente! ID: ${result.data?.id}`);

      await this.saveNotification({
        email: to,
        type: isPanic ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject,
        body: html,
        status: NotificationStatus.SENT,
        metadata: { messageId: result.data?.id, location },
      });

      return { success: true, messageId: result.data?.id };
    } catch (error: any) {
      logger.error('❌ Error enviando email:', error);

      await this.saveNotification({
        email: to,
        type: isPanic ? NotificationType.EMERGENCY_ALERT : NotificationType.ACCESS_NOTIFICATION,
        channel: NotificationChannel.EMAIL,
        subject,
        body: html,
        status: NotificationStatus.FAILED,
        errorMessage: error.message,
        metadata: { location },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Notifica a todos los representantes de un usuario (SMS + Email)
   */
  async notifyAllRepresentatives(params: {
    userId: string;
    patientName: string;
    type: 'PANIC' | 'QR_ACCESS';
    location: { lat: number; lng: number };
    accessorName?: string;
    nearestHospital?: string;
    nearbyHospitals?: Array<{ name: string; distance: number; phone?: string }>;
  }): Promise<NotificationResult[]> {
    const { userId, patientName, type, location, accessorName, nearestHospital, nearbyHospitals } = params;

    // Obtener representantes con notificacion activada
    const representatives = await prisma.representative.findMany({
      where: {
        userId,
        notifyOnEmergency: true,
      },
      orderBy: { priority: 'asc' },
    });

    if (representatives.length === 0) {
      logger.warn(`⚠️ No hay representantes configurados para notificar al usuario ${userId}`);
      return [];
    }

    logger.info(`📢 Iniciando notificaciones para ${representatives.length} representantes del usuario ${userId}`);
    logger.info(`📋 Representantes a notificar: ${representatives.map(r => `${r.name} (${r.phone}${r.email ? ', ' + r.email : ''})`).join(', ')}`);


    const results: NotificationResult[] = [];

    for (const rep of representatives) {
      try {
        logger.info(`📤 Procesando notificaciones para representante: ${rep.name} (${rep.phone})`);

        // Enviar SMS
        const smsResult = await this.sendEmergencySMS({
          to: rep.phone,
          patientName,
          location,
          type,
          accessorName,
          nearestHospital,
        });

        // Enviar WhatsApp
        const whatsappResult = await this.sendEmergencyWhatsApp({
          to: rep.phone,
          patientName,
          location,
          type,
          accessorName,
          nearestHospital,
        });

        // Enviar Email si tiene email configurado
        let emailResult: EmailResult = { success: false };
        if (rep.email) {
          emailResult = await this.sendEmergencyEmail({
            to: rep.email,
            patientName,
            location,
            type,
            accessorName,
            nearestHospital,
            nearbyHospitals,
          });
        }

        results.push({
          representativeId: rep.id,
          name: rep.name,
          phone: rep.phone,
          email: rep.email || undefined,
          smsStatus: smsResult.success ? 'sent' : 'failed',
          whatsappStatus: whatsappResult.success ? 'sent' : 'failed',
          emailStatus: rep.email ? (emailResult.success ? 'sent' : 'failed') : 'skipped',
          messageId: smsResult.messageId,
          error: smsResult.error || whatsappResult.error || emailResult.error,
        });

        logger.info(`✅ Notificaciones procesadas para ${rep.name}: SMS=${smsResult.success ? 'OK' : 'FAIL'}, WhatsApp=${whatsappResult.success ? 'OK' : 'FAIL'}, Email=${rep.email ? (emailResult.success ? 'OK' : 'FAIL') : 'SKIPPED'}`);
      } catch (error: any) {
        // Capturar errores inesperados para este representante, pero continuar con los demás
        logger.error(`❌ Error inesperado procesando notificaciones para ${rep.name}:`, error);
        results.push({
          representativeId: rep.id,
          name: rep.name,
          phone: rep.phone,
          email: rep.email || undefined,
          smsStatus: 'failed',
          whatsappStatus: 'failed',
          emailStatus: 'failed',
          error: `Error inesperado: ${error.message}`,
        });
        // Continuar con el siguiente representante
      }
    }

    // Resumen de notificaciones enviadas
    const successCount = results.filter(r => r.smsStatus === 'sent' || r.whatsappStatus === 'sent' || r.emailStatus === 'sent').length;
    const failCount = results.filter(r => r.smsStatus === 'failed' && r.whatsappStatus === 'failed' && (r.emailStatus === 'failed' || r.emailStatus === 'skipped')).length;
    logger.info(`📊 Resumen de notificaciones: ${successCount}/${results.length} representantes notificados exitosamente${failCount > 0 ? `, ${failCount} con fallos` : ''}`);

    return results;
  }

  /**
   * Guarda una notificacion en la base de datos
   */
  private async saveNotification(data: {
    userId?: string;
    email?: string;
    phone?: string;
    type: NotificationType;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    status: NotificationStatus;
    errorMessage?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          email: data.email,
          phone: data.phone,
          type: data.type,
          channel: data.channel,
          subject: data.subject,
          body: data.body,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata,
          sentAt: data.status === NotificationStatus.SENT ? new Date() : null,
          failedAt: data.status === NotificationStatus.FAILED ? new Date() : null,
        },
      });
    } catch (error) {
      logger.error('Error guardando notificacion en BD:', error);
    }
  }

  /**
   * Formatea numero de telefono para Twilio SMS (E.164)
   * Mantiene el formato exacto como está verificado en Twilio
   */
  private formatPhoneNumber(phone: string): string {
    // Remover espacios y caracteres especiales
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    // Si no empieza con +, asumir Mexico (+52)
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('52')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+52' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * Formatea numero de telefono para WhatsApp
   * WhatsApp en México requiere +521 para números móviles
   */
  private formatPhoneNumberForWhatsApp(phone: string): string {
    // Remover espacios y caracteres especiales
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    // Si no empieza con +, agregar código de México
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('52')) {
        cleaned = '+' + cleaned;
      } else {
        // Número local, agregar +52
        cleaned = '+52' + cleaned;
      }
    }

    // NOTA: Anteriormente se forzaba +521, pero las pruebas indican que +52 funciona mejor
    // para los templates actuales.

    return cleaned;
  }

  /**
   * Verifica si el servicio esta en modo simulacion
   */
  isInSimulationMode(): boolean {
    return this.isSimulationMode;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
