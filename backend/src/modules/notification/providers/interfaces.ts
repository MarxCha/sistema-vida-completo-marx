// src/modules/notification/providers/interfaces.ts

/**
 * Interfaces para el sistema de proveedores de notificaciones.
 * Provider Pattern para permitir migración gradual y rollback instantáneo.
 */

export interface NotificationParams {
  to: string;
  patientName: string;
  location: { lat: number; lng: number };
  type: 'PANIC' | 'QR_ACCESS';
  accessorName?: string;
  nearestHospital?: string;
  nearbyHospitals?: Array<{ name: string; distance: number; phone?: string }>;
  locale?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

export interface IWhatsAppProvider {
  send(params: NotificationParams): Promise<SendResult>;
  getName(): string;
  isAvailable(): boolean;
}

export interface ISMSProvider {
  send(params: NotificationParams): Promise<SendResult>;
  getName(): string;
  isAvailable(): boolean;
}

export interface IEmailProvider {
  send(params: NotificationParams): Promise<SendResult>;
  getName(): string;
  isAvailable(): boolean;
}
