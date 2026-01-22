// src/modules/payments/types/payments.types.ts
import {
  BillingCycle,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethodType,
  InvoiceStatus
} from '@prisma/client';

// ==================== PLANES ====================

export interface PlanFeatures {
  advanceDirectives: boolean;      // Directivas de voluntad anticipada
  donorPreferences: boolean;       // Preferencias de donación
  nom151Seal: boolean;             // Sello NOM-151
  smsNotifications: boolean;       // Notificaciones SMS
  exportData: boolean;             // Exportar datos
  prioritySupport: boolean;        // Soporte prioritario
}

export interface PlanLimits {
  representativesLimit: number;    // Máximo de representantes
  qrDownloadsPerMonth: number;     // Descargas de QR por mes (0 = ilimitado)
}

export interface SubscriptionPlanDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: string;
  features: PlanFeatures;
  limits: PlanLimits;
  trialDays: number;
  isDefault: boolean;
  displayOrder: number;
}

// ==================== SUSCRIPCIONES ====================

export interface SubscriptionDTO {
  id: string;
  userId: string;
  plan: SubscriptionPlanDTO;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface CreateSubscriptionInput {
  planId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}

export interface UpgradeSubscriptionInput {
  planId: string;
  billingCycle: BillingCycle;
}

// ==================== PAGOS ====================

export interface PaymentDTO {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  last4: string | null;
  cardBrand: string | null;
  oxxoVoucherUrl: string | null;
  oxxoExpiresAt: Date | null;
  status: PaymentStatus;
  description: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface CreatePaymentIntentInput {
  amount: number;
  currency?: string;
  paymentMethodType: PaymentMethodType;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
  oxxoVoucherUrl?: string;
  oxxoExpiresAt?: Date;
}

// ==================== METODOS DE PAGO ====================

export interface PaymentMethodDTO {
  id: string;
  stripePaymentMethodId: string;
  type: PaymentMethodType;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  cardholderName: string | null;
  isDefault: boolean;
  createdAt: Date;
}

export interface SavePaymentMethodInput {
  stripePaymentMethodId: string;
  setAsDefault?: boolean;
}

// ==================== DATOS FISCALES ====================

export interface FiscalDataDTO {
  id: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCFDI: string;
  codigoPostal: string;
  calle: string | null;
  numExterior: string | null;
  numInterior: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  emailFacturacion: string;
  createdAt: Date;
}

export interface SaveFiscalDataInput {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCFDI?: string;
  codigoPostal: string;
  calle?: string;
  numExterior?: string;
  numInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  emailFacturacion: string;
}

// ==================== FACTURAS ====================

export interface InvoiceDTO {
  id: string;
  paymentId: string;
  uuid: string | null;
  serie: string | null;
  folio: string | null;
  subtotal: number;
  iva: number;
  total: number;
  xmlUrl: string | null;
  pdfUrl: string | null;
  status: InvoiceStatus;
  issuedAt: Date | null;
  createdAt: Date;
}

export interface GenerateInvoiceInput {
  paymentId: string;
}

// ==================== STRIPE WEBHOOKS ====================

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ==================== CHECKOUT ====================

export interface CreateCheckoutSessionInput {
  planId: string;
  billingCycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

// ==================== BILLING PORTAL ====================

export interface BillingPortalResult {
  url: string;
}

// ==================== STATS (ADMIN) ====================

export interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  conversionRate: number;
  averageRevenuePerUser: number;
  revenueByMonth: { month: string; amount: number }[];
  subscriptionsByPlan: { plan: string; count: number }[];
}

// ==================== REGIMENES FISCALES SAT ====================

export const REGIMENES_FISCALES = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
} as const;

// ==================== USOS CFDI SAT ====================

export const USOS_CFDI = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina por inversiones',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de cómputo y accesorios',
  'I05': 'Dados, troqueles, moldes, matrices y herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos, dentales y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad o discapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses reales efectivamente pagados por créditos hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar obligatoria',
  'D09': 'Depósitos en cuentas para el ahorro, primas de pensiones',
  'D10': 'Pagos por servicios educativos (colegiaturas)',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
  'CN01': 'Nómina',
} as const;
