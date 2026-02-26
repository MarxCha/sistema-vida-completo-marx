// src/modules/notification/__tests__/providers.test.ts

// Mocks globales (hoisted por Jest)
jest.mock('../../../common/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../../common/utils/geolocation', () => ({
  getGoogleMapsUrl: jest.fn(() => 'https://maps.google.com/?q=19.4,-99.1'),
}));

jest.mock('../../../config', () => ({
  default: {
    twilio: { sid: '', token: '', phone: '', whatsappPhone: '', whatsappTemplateId: '' },
    waba: {
      provider: 'twilio',
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      apiVersion: 'v18.0',
      fallbackToTwilio: false,
      templateEmergency: '',
      templateAccess: '',
    },
    email: { resendApiKey: '', from: 'test@test.com' },
  },
  __esModule: true,
}));

import { formatPhoneForSMS, formatPhoneForWhatsApp, formatPhoneForWABA } from '../providers/phone-utils';

// ═══════════════════════════════════════════════════════════════
// PHONE UTILS
// ═══════════════════════════════════════════════════════════════

describe('Phone Utils', () => {
  describe('formatPhoneForSMS', () => {
    it('agrega +52 a número local de 10 dígitos', () => {
      expect(formatPhoneForSMS('5512345678')).toBe('+525512345678');
    });

    it('agrega + a número con código de país', () => {
      expect(formatPhoneForSMS('525512345678')).toBe('+525512345678');
    });

    it('mantiene número con + intacto', () => {
      expect(formatPhoneForSMS('+525512345678')).toBe('+525512345678');
    });

    it('limpia espacios y caracteres especiales', () => {
      expect(formatPhoneForSMS('+52 (55) 1234-5678')).toBe('+525512345678');
    });

    it('limpia puntos', () => {
      expect(formatPhoneForSMS('55.1234.5678')).toBe('+525512345678');
    });

    it('limpia + intercalado en número malformado', () => {
      // + intercalado se elimina, queda 5512345678, se agrega +52
      expect(formatPhoneForSMS('551234+5678')).toBe('+525512345678');
    });
  });

  describe('formatPhoneForWhatsApp', () => {
    it('formatea igual que SMS (E.164)', () => {
      expect(formatPhoneForWhatsApp('5512345678')).toBe('+525512345678');
    });

    it('mantiene formato +52', () => {
      expect(formatPhoneForWhatsApp('+525512345678')).toBe('+525512345678');
    });
  });

  describe('formatPhoneForWABA', () => {
    it('retorna solo dígitos sin +', () => {
      expect(formatPhoneForWABA('+525512345678')).toBe('525512345678');
    });

    it('formatea número local para WABA', () => {
      expect(formatPhoneForWABA('5512345678')).toBe('525512345678');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER INTERFACES
// ═══════════════════════════════════════════════════════════════

describe('Provider Interfaces', () => {
  it('TwilioSMSProvider implements ISMSProvider', () => {
    const { TwilioSMSProvider } = require('../providers/sms/twilio-sms.provider');
    const provider = new TwilioSMSProvider();
    expect(provider.getName()).toBe('twilio-sms');
    expect(typeof provider.isAvailable()).toBe('boolean');
    expect(provider.isAvailable()).toBe(false); // no credentials
    expect(typeof provider.send).toBe('function');
  });

  it('TwilioWhatsAppProvider implements IWhatsAppProvider', () => {
    const { TwilioWhatsAppProvider } = require('../providers/whatsapp/twilio-wa.provider');
    const provider = new TwilioWhatsAppProvider();
    expect(provider.getName()).toBe('twilio');
    expect(typeof provider.isAvailable()).toBe('boolean');
    expect(provider.isAvailable()).toBe(false); // no credentials
    expect(typeof provider.send).toBe('function');
  });

  it('WABAProvider implements IWhatsAppProvider', () => {
    const { WABAProvider } = require('../providers/whatsapp/waba.provider');
    const provider = new WABAProvider();
    expect(provider.getName()).toBe('waba');
    expect(typeof provider.isAvailable()).toBe('boolean');
    expect(provider.isAvailable()).toBe(false); // no credentials
    expect(typeof provider.send).toBe('function');
  });

  it('ResendEmailProvider implements IEmailProvider', () => {
    const { ResendEmailProvider } = require('../providers/email/resend-email.provider');
    const provider = new ResendEmailProvider();
    expect(provider.getName()).toBe('resend');
    expect(typeof provider.isAvailable()).toBe('boolean');
    expect(provider.isAvailable()).toBe(false); // no credentials
    expect(typeof provider.send).toBe('function');
  });

  it('Providers unavailable return error on send', async () => {
    const { TwilioSMSProvider } = require('../providers/sms/twilio-sms.provider');
    const provider = new TwilioSMSProvider();

    const result = await provider.send({
      to: '+525512345678',
      patientName: 'Test',
      location: { lat: 19.4, lng: -99.1 },
      type: 'PANIC' as const,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('no disponible');
    expect(result.provider).toBe('twilio-sms');
  });
});

// ═══════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════

describe('WhatsAppProviderFactory', () => {
  beforeEach(() => {
    jest.resetModules();

    // Re-apply mocks after resetModules
    jest.mock('../../../common/services/logger.service', () => ({
      logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
    }));

    jest.mock('../../../common/utils/geolocation', () => ({
      getGoogleMapsUrl: jest.fn(() => 'https://maps.google.com/?q=19.4,-99.1'),
    }));
  });

  it('crea TwilioWhatsAppProvider cuando WHATSAPP_PROVIDER=twilio', () => {
    jest.mock('../../../config', () => ({
      default: {
        twilio: { sid: '', token: '', phone: '', whatsappPhone: '', whatsappTemplateId: '' },
        waba: {
          provider: 'twilio', phoneNumberId: '', accessToken: '', businessAccountId: '',
          apiVersion: 'v18.0', fallbackToTwilio: false, templateEmergency: '', templateAccess: '',
        },
        email: { resendApiKey: '', from: 'test@test.com' },
      },
      __esModule: true,
    }));

    const { WhatsAppProviderFactory } = require('../providers/whatsapp/factory');
    const provider = WhatsAppProviderFactory.create();
    expect(provider.getName()).toBe('twilio');
  });

  it('crea WABAProvider cuando WHATSAPP_PROVIDER=waba sin fallback', () => {
    jest.mock('../../../config', () => ({
      default: {
        twilio: { sid: '', token: '', phone: '', whatsappPhone: '', whatsappTemplateId: '' },
        waba: {
          provider: 'waba', phoneNumberId: 'test-id', accessToken: 'test-token',
          businessAccountId: 'test-biz', apiVersion: 'v18.0', fallbackToTwilio: false,
          templateEmergency: '', templateAccess: '',
        },
        email: { resendApiKey: '', from: 'test@test.com' },
      },
      __esModule: true,
    }));

    const { WhatsAppProviderFactory } = require('../providers/whatsapp/factory');
    const provider = WhatsAppProviderFactory.create();
    expect(provider.getName()).toBe('waba');
  });

  it('crea WhatsAppWithFallback cuando WHATSAPP_PROVIDER=waba + fallback=true', () => {
    jest.mock('../../../config', () => ({
      default: {
        twilio: { sid: '', token: '', phone: '', whatsappPhone: '', whatsappTemplateId: '' },
        waba: {
          provider: 'waba', phoneNumberId: 'test-id', accessToken: 'test-token',
          businessAccountId: 'test-biz', apiVersion: 'v18.0', fallbackToTwilio: true,
          templateEmergency: '', templateAccess: '',
        },
        email: { resendApiKey: '', from: 'test@test.com' },
      },
      __esModule: true,
    }));

    const { WhatsAppProviderFactory } = require('../providers/whatsapp/factory');
    const provider = WhatsAppProviderFactory.create();
    expect(provider.getName()).toContain('waba+fallback:twilio');
  });
});
