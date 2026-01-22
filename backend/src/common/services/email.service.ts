// src/common/services/email.service.ts
/**
 * Servicio de Email para Sistema VIDA
 *
 * Soporta múltiples proveedores:
 * - SendGrid (recomendado para producción)
 * - SMTP genérico (Gmail, Outlook, etc.)
 * - AWS SES
 * - Console (desarrollo - solo loggea)
 *
 * Configuración vía variables de entorno:
 * - EMAIL_PROVIDER: 'sendgrid' | 'smtp' | 'ses' | 'console'
 * - SENDGRID_API_KEY: API key de SendGrid
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: Para SMTP
 * - EMAIL_FROM: Dirección de envío por defecto
 */

import nodemailer from 'nodemailer';
import config from '../../config';
import { logger } from './logger.service';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type EmailProvider = 'sendgrid' | 'smtp' | 'ses' | 'console';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const EMAIL_CONFIG = {
  provider: (process.env.EMAIL_PROVIDER || 'console') as EmailProvider,
  from: process.env.EMAIL_FROM || 'Sistema VIDA <noreply@sistemavida.mx>',
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  ses: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO DE EMAIL
// ═══════════════════════════════════════════════════════════════════════════

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private provider: EmailProvider;
  private isConfigured: boolean = false;

  constructor() {
    this.provider = EMAIL_CONFIG.provider;
    this.initializeTransporter();
  }

  /**
   * Inicializa el transporter según el proveedor configurado
   */
  private initializeTransporter(): void {
    try {
      switch (this.provider) {
        case 'sendgrid':
          this.initializeSendGrid();
          break;
        case 'smtp':
          this.initializeSMTP();
          break;
        case 'ses':
          this.initializeSES();
          break;
        case 'console':
        default:
          this.initializeConsole();
          break;
      }
    } catch (error) {
      logger.error('Error inicializando servicio de email', error);
      this.initializeConsole();
    }
  }

  private initializeSendGrid(): void {
    if (!EMAIL_CONFIG.sendgrid.apiKey) {
      logger.warn('SENDGRID_API_KEY no configurado, usando console');
      this.initializeConsole();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: EMAIL_CONFIG.sendgrid.apiKey,
      },
    });

    this.isConfigured = true;
    logger.info('Email service inicializado con SendGrid');
  }

  private initializeSMTP(): void {
    if (!EMAIL_CONFIG.smtp.user || !EMAIL_CONFIG.smtp.pass) {
      logger.warn('SMTP credentials no configuradas, usando console');
      this.initializeConsole();
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
      secure: EMAIL_CONFIG.smtp.secure,
      auth: {
        user: EMAIL_CONFIG.smtp.user,
        pass: EMAIL_CONFIG.smtp.pass,
      },
    });

    this.isConfigured = true;
    logger.info('Email service inicializado con SMTP', {
      host: EMAIL_CONFIG.smtp.host,
      port: EMAIL_CONFIG.smtp.port,
    });
  }

  private initializeSES(): void {
    if (!EMAIL_CONFIG.ses.accessKeyId || !EMAIL_CONFIG.ses.secretAccessKey) {
      logger.warn('AWS SES credentials no configuradas, usando console');
      this.initializeConsole();
      return;
    }

    // AWS SES via nodemailer
    this.transporter = nodemailer.createTransport({
      host: `email-smtp.${EMAIL_CONFIG.ses.region}.amazonaws.com`,
      port: 587,
      auth: {
        user: EMAIL_CONFIG.ses.accessKeyId,
        pass: EMAIL_CONFIG.ses.secretAccessKey,
      },
    });

    this.isConfigured = true;
    logger.info('Email service inicializado con AWS SES');
  }

  private initializeConsole(): void {
    this.provider = 'console';
    this.isConfigured = false;
    this.transporter = null;

    if (config.env === 'production') {
      logger.warn('Email service en modo CONSOLE en producción - emails no serán enviados');
    } else {
      logger.info('Email service en modo CONSOLE (desarrollo)');
    }
  }

  /**
   * Envía un email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const { to, subject, html, text, from, replyTo, attachments } = options;

    const mailOptions = {
      from: from || EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text: text || this.htmlToText(html),
      replyTo,
      attachments,
    };

    // Modo console - solo loggear
    if (!this.isConfigured || !this.transporter) {
      logger.info('📧 [EMAIL SIMULADO]', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        preview: html.substring(0, 200) + '...',
      });

      // En desarrollo, mostrar el contenido completo
      if (config.env === 'development') {
        logger.info('\n════════════════════════════════════════');
        logger.info('📧 EMAIL (modo desarrollo)');
        logger.info('════════════════════════════════════════');
        logger.info(`To: ${mailOptions.to}`);
        logger.info(`Subject: ${mailOptions.subject}`);
        logger.info('────────────────────────────────────────');
        logger.info(mailOptions.text || 'Sin texto plano');
        logger.info('════════════════════════════════════════\n');
      }

      return {
        success: true,
        messageId: `console-${Date.now()}`,
      };
    }

    try {
      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email enviado exitosamente', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      logger.error('Error enviando email', error, {
        to: mailOptions.to,
        subject: mailOptions.subject,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Convierte HTML a texto plano básico
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Verifica si el servicio está configurado para enviar emails reales
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Obtiene información del proveedor actual
   */
  getProviderInfo(): { provider: string; configured: boolean } {
    return {
      provider: this.provider,
      configured: this.isConfigured,
    };
  }

  /**
   * Verifica la conexión con el servidor de email
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Error verificando conexión de email', error);
      return false;
    }
  }
}

// Singleton
export const emailService = new EmailService();
export default emailService;
