// src/modules/odoo/odoo.service.ts
import { logger } from '../../common/services/logger.service';
import xmlrpc from 'xmlrpc';
import { config } from '../../config';

interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

interface PartnerData {
  name: string;
  email: string;
  phone?: string;
  vat?: string; // RFC en México
  street?: string;
  city?: string;
  zip?: string;
  country_id?: number; // 156 = México
  is_company: boolean;
  customer_rank: number;
}

interface InvoiceLineData {
  product_id?: number;
  name: string;
  quantity: number;
  price_unit: number;
}

interface InvoiceData {
  partner_id: number;
  move_type: 'out_invoice' | 'out_refund'; // Factura cliente o nota de crédito
  invoice_date: string; // YYYY-MM-DD
  invoice_line_ids: InvoiceLineData[];
  ref?: string; // Referencia externa (ej: ID de Stripe)
}

interface PaymentData {
  partner_id: number;
  amount: number;
  payment_type: 'inbound' | 'outbound';
  journal_id: number; // Diario de banco/efectivo
  ref?: string;
  date: string;
}

class OdooService {
  private config: OdooConfig;
  private uid: number | null = null;
  private commonClient: xmlrpc.Client | null = null;
  private objectClient: xmlrpc.Client | null = null;

  constructor() {
    this.config = {
      url: config.odoo?.url || '',
      db: config.odoo?.db || '',
      username: config.odoo?.username || '',
      password: config.odoo?.password || '',
    };
  }

  /**
   * Verifica si Odoo está configurado
   */
  isConfigured(): boolean {
    return !!(this.config.url && this.config.db && this.config.username && this.config.password);
  }

  /**
   * Inicializa los clientes XML-RPC
   */
  private initClients(): void {
    if (!this.isConfigured()) {
      throw new Error('Odoo no está configurado. Verificar variables de entorno.');
    }

    const urlObj = new URL(this.config.url);
    const isSecure = urlObj.protocol === 'https:';
    const port = urlObj.port ? parseInt(urlObj.port) : (isSecure ? 443 : 80);

    const clientOptions = {
      host: urlObj.hostname,
      port,
      path: '/xmlrpc/2/common',
    };

    if (isSecure) {
      this.commonClient = xmlrpc.createSecureClient(clientOptions);
      this.objectClient = xmlrpc.createSecureClient({
        ...clientOptions,
        path: '/xmlrpc/2/object',
      });
    } else {
      this.commonClient = xmlrpc.createClient(clientOptions);
      this.objectClient = xmlrpc.createClient({
        ...clientOptions,
        path: '/xmlrpc/2/object',
      });
    }
  }

  /**
   * Autenticación con Odoo
   */
  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    this.initClients();

    return new Promise((resolve, reject) => {
      this.commonClient!.methodCall(
        'authenticate',
        [this.config.db, this.config.username, this.config.password, {}],
        (error, uid) => {
          if (error) {
            logger.error('❌ Error autenticando con Odoo:', error);
            reject(error);
          } else if (!uid) {
            reject(new Error('Credenciales de Odoo inválidas'));
          } else {
            this.uid = uid as number;
            logger.info('✅ Autenticado con Odoo, UID:', uid);
            resolve(uid as number);
          }
        }
      );
    });
  }

  /**
   * Ejecuta un método en Odoo
   */
  private async execute(model: string, method: string, args: any[], kwargs: any = {}): Promise<any> {
    const uid = await this.authenticate();

    return new Promise((resolve, reject) => {
      this.objectClient!.methodCall(
        'execute_kw',
        [this.config.db, uid, this.config.password, model, method, args, kwargs],
        (error, result) => {
          if (error) {
            logger.error(`❌ Error en Odoo ${model}.${method}:`, error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  // ==================== PARTNERS (CLIENTES) ====================

  /**
   * Busca un partner por email
   */
  async findPartnerByEmail(email: string): Promise<number | null> {
    try {
      const ids = await this.execute('res.partner', 'search', [[['email', '=', email]]]);
      return ids.length > 0 ? ids[0] : null;
    } catch (error) {
      logger.error('Error buscando partner:', error);
      return null;
    }
  }

  /**
   * Crea o actualiza un partner (cliente)
   */
  async upsertPartner(data: Partial<PartnerData> & { email: string }): Promise<number> {
    const existingId = await this.findPartnerByEmail(data.email);

    const partnerData: PartnerData = {
      name: data.name || data.email,
      email: data.email,
      phone: data.phone,
      vat: data.vat,
      street: data.street,
      city: data.city,
      zip: data.zip,
      country_id: data.country_id || 156, // México por defecto
      is_company: data.is_company || false,
      customer_rank: 1,
    };

    // Limpiar campos undefined
    Object.keys(partnerData).forEach(key => {
      if (partnerData[key as keyof PartnerData] === undefined) {
        delete partnerData[key as keyof PartnerData];
      }
    });

    if (existingId) {
      await this.execute('res.partner', 'write', [[existingId], partnerData]);
      logger.info(`✅ Partner actualizado en Odoo: ${data.email} (ID: ${existingId})`);
      return existingId;
    } else {
      const newId = await this.execute('res.partner', 'create', [partnerData]);
      logger.info(`✅ Partner creado en Odoo: ${data.email} (ID: ${newId})`);
      return newId;
    }
  }

  // ==================== PRODUCTOS (PLANES) ====================

  /**
   * Busca un producto por referencia interna
   */
  async findProductByRef(ref: string): Promise<number | null> {
    try {
      const ids = await this.execute('product.product', 'search', [[['default_code', '=', ref]]]);
      return ids.length > 0 ? ids[0] : null;
    } catch (error) {
      logger.error('Error buscando producto:', error);
      return null;
    }
  }

  /**
   * Crea un producto (plan de suscripción)
   */
  async createProduct(data: {
    name: string;
    ref: string;
    price: number;
    description?: string;
  }): Promise<number> {
    const existing = await this.findProductByRef(data.ref);
    if (existing) return existing;

    const productData = {
      name: data.name,
      default_code: data.ref,
      list_price: data.price,
      type: 'service',
      description_sale: data.description,
    };

    const newId = await this.execute('product.product', 'create', [productData]);
    logger.info(`✅ Producto creado en Odoo: ${data.name} (ID: ${newId})`);
    return newId;
  }

  // ==================== FACTURAS ====================

  /**
   * Crea una factura de cliente
   */
  async createInvoice(data: {
    partnerId: number;
    lines: Array<{
      productId?: number;
      description: string;
      quantity: number;
      price: number;
    }>;
    reference?: string;
    date?: string;
  }): Promise<number> {
    const invoiceLines = data.lines.map(line => [
      0,
      0,
      {
        product_id: line.productId || false,
        name: line.description,
        quantity: line.quantity,
        price_unit: line.price,
      },
    ]);

    const invoiceData = {
      partner_id: data.partnerId,
      move_type: 'out_invoice',
      invoice_date: data.date || new Date().toISOString().split('T')[0],
      invoice_line_ids: invoiceLines,
      ref: data.reference,
    };

    const invoiceId = await this.execute('account.move', 'create', [invoiceData]);
    logger.info(`✅ Factura creada en Odoo (ID: ${invoiceId})`);
    return invoiceId;
  }

  /**
   * Confirma (valida) una factura
   */
  async confirmInvoice(invoiceId: number): Promise<void> {
    await this.execute('account.move', 'action_post', [[invoiceId]]);
    logger.info(`✅ Factura confirmada en Odoo (ID: ${invoiceId})`);
  }

  /**
   * Crea y confirma una factura
   */
  async createAndConfirmInvoice(data: {
    partnerId: number;
    lines: Array<{
      productId?: number;
      description: string;
      quantity: number;
      price: number;
    }>;
    reference?: string;
    date?: string;
  }): Promise<number> {
    const invoiceId = await this.createInvoice(data);
    await this.confirmInvoice(invoiceId);
    return invoiceId;
  }

  // ==================== PAGOS ====================

  /**
   * Obtiene el diario de banco por defecto
   */
  async getDefaultBankJournal(): Promise<number | null> {
    try {
      const ids = await this.execute('account.journal', 'search', [
        [['type', '=', 'bank']],
      ], { limit: 1 });
      return ids.length > 0 ? ids[0] : null;
    } catch (error) {
      logger.error('Error buscando diario de banco:', error);
      return null;
    }
  }

  /**
   * Registra un pago
   */
  async createPayment(data: {
    partnerId: number;
    amount: number;
    reference?: string;
    date?: string;
    journalId?: number;
  }): Promise<number> {
    const journalId = data.journalId || await this.getDefaultBankJournal();
    if (!journalId) {
      throw new Error('No se encontró un diario de banco en Odoo');
    }

    const paymentData = {
      partner_id: data.partnerId,
      amount: data.amount,
      payment_type: 'inbound',
      partner_type: 'customer',
      journal_id: journalId,
      ref: data.reference,
      date: data.date || new Date().toISOString().split('T')[0],
    };

    const paymentId = await this.execute('account.payment', 'create', [paymentData]);
    logger.info(`✅ Pago registrado en Odoo (ID: ${paymentId})`);

    // Confirmar el pago
    await this.execute('account.payment', 'action_post', [[paymentId]]);
    logger.info(`✅ Pago confirmado en Odoo (ID: ${paymentId})`);

    return paymentId;
  }

  // ==================== INTEGRACIÓN CON STRIPE ====================

  /**
   * Sincroniza un pago de Stripe a Odoo
   * Crea el cliente, la factura y el pago
   */
  async syncStripePayment(data: {
    customerEmail: string;
    customerName: string;
    customerPhone?: string;
    planName: string;
    planRef: string;
    amount: number; // En centavos (Stripe)
    stripePaymentId: string;
    stripeInvoiceId?: string;
  }): Promise<{
    partnerId: number;
    invoiceId: number;
    paymentId: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Odoo no está configurado');
    }

    // 1. Crear/actualizar cliente
    const partnerId = await this.upsertPartner({
      email: data.customerEmail,
      name: data.customerName,
      phone: data.customerPhone,
    });

    // 2. Buscar o crear producto
    const productId = await this.findProductByRef(data.planRef);

    // 3. Crear factura
    const amountMXN = data.amount / 100; // Convertir de centavos
    const invoiceId = await this.createAndConfirmInvoice({
      partnerId,
      lines: [{
        productId: productId || undefined,
        description: `Suscripción: ${data.planName}`,
        quantity: 1,
        price: amountMXN,
      }],
      reference: data.stripeInvoiceId || data.stripePaymentId,
    });

    // 4. Registrar pago
    const paymentId = await this.createPayment({
      partnerId,
      amount: amountMXN,
      reference: `Stripe: ${data.stripePaymentId}`,
    });

    logger.info(`✅ Pago de Stripe sincronizado a Odoo:`, {
      partnerId,
      invoiceId,
      paymentId,
    });

    return { partnerId, invoiceId, paymentId };
  }

  /**
   * Test de conexión
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        logger.info('⚠️ Odoo no está configurado');
        return false;
      }

      await this.authenticate();

      // Verificar que podemos leer partners
      const count = await this.execute('res.partner', 'search_count', [[]]);
      logger.info(`✅ Conexión a Odoo exitosa. Partners en sistema: ${count}`);
      return true;
    } catch (error) {
      logger.error('❌ Error conectando a Odoo:', error);
      return false;
    }
  }
}

export const odooService = new OdooService();
export default odooService;
