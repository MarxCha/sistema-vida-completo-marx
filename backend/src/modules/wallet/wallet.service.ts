// src/modules/wallet/wallet.service.ts
import { PKPass } from 'passkit-generator';
import { config } from '../../config';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

interface EmergencyPassData {
  id: string;
  name: string;
  bloodType?: string;
  allergies?: string[];
  conditions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
  };
  emergencyUrl: string;
}

interface WalletConfig {
  apple: {
    teamId: string;
    passTypeId: string;
    wwdr: Buffer | null;  // Apple WWDR certificate
    signerCert: Buffer | null;  // Pass Type ID certificate
    signerKey: Buffer | null;  // Pass Type ID private key
    signerKeyPassphrase?: string;
  };
  google: {
    issuerId: string;
    serviceAccountEmail: string;
    privateKey: string;
  };
}

class WalletService {
  private config: WalletConfig;
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, 'templates');

    this.config = {
      apple: {
        teamId: process.env.APPLE_TEAM_ID || '',
        passTypeId: process.env.APPLE_PASS_TYPE_ID || 'pass.mx.sistemavida.emergency',
        wwdr: this.loadCertificate('APPLE_WWDR_CERT'),
        signerCert: this.loadCertificate('APPLE_PASS_CERT'),
        signerKey: this.loadCertificate('APPLE_PASS_KEY'),
        signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE,
      },
      google: {
        issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || '',
        serviceAccountEmail: process.env.GOOGLE_WALLET_SERVICE_EMAIL || '',
        privateKey: process.env.GOOGLE_WALLET_PRIVATE_KEY || '',
      },
    };
  }

  private loadCertificate(envVar: string): Buffer | null {
    const value = process.env[envVar];
    if (!value) return null;

    // Si es un path a archivo, leerlo
    if (fs.existsSync(value)) {
      return fs.readFileSync(value);
    }

    // Si es contenido base64, decodificarlo
    if (value.startsWith('-----BEGIN')) {
      return Buffer.from(value);
    }

    try {
      return Buffer.from(value, 'base64');
    } catch {
      return null;
    }
  }

  /**
   * Verifica si Apple Wallet está configurado
   */
  isAppleWalletConfigured(): boolean {
    return !!(
      this.config.apple.teamId &&
      this.config.apple.passTypeId &&
      this.config.apple.wwdr &&
      this.config.apple.signerCert &&
      this.config.apple.signerKey
    );
  }

  /**
   * Verifica si Google Wallet está configurado
   */
  isGoogleWalletConfigured(): boolean {
    return !!(
      this.config.google.issuerId &&
      this.config.google.serviceAccountEmail &&
      this.config.google.privateKey
    );
  }

  /**
   * Genera un pase de Apple Wallet (.pkpass)
   */
  async generateApplePass(data: EmergencyPassData): Promise<Buffer> {
    if (!this.isAppleWalletConfigured()) {
      throw new Error('Apple Wallet no está configurado. Verificar certificados.');
    }

    // Crear datos secundarios para el pase
    const secondaryFields = [];
    const backFields = [];

    if (data.bloodType) {
      secondaryFields.push({
        key: 'bloodType',
        label: 'TIPO DE SANGRE',
        value: data.bloodType,
      });
    }

    if (data.allergies?.length) {
      backFields.push({
        key: 'allergies',
        label: 'ALERGIAS',
        value: data.allergies.join(', '),
      });
    }

    if (data.conditions?.length) {
      backFields.push({
        key: 'conditions',
        label: 'CONDICIONES MÉDICAS',
        value: data.conditions.join(', '),
      });
    }

    if (data.emergencyContact) {
      backFields.push({
        key: 'emergencyContact',
        label: 'CONTACTO DE EMERGENCIA',
        value: `${data.emergencyContact.name}: ${data.emergencyContact.phone}`,
      });
    }

    backFields.push({
      key: 'moreInfo',
      label: 'MÁS INFORMACIÓN',
      value: 'Escanea el código QR o visita la URL para ver el perfil médico completo.',
    });

    const pass = new PKPass(
      {},
      {
        wwdr: this.config.apple.wwdr!,
        signerCert: this.config.apple.signerCert!,
        signerKey: this.config.apple.signerKey!,
        signerKeyPassphrase: this.config.apple.signerKeyPassphrase,
      },
      {
        formatVersion: 1,
        passTypeIdentifier: this.config.apple.passTypeId,
        teamIdentifier: this.config.apple.teamId,
        serialNumber: data.id,
        organizationName: 'Sistema VIDA',
        description: 'Tarjeta de Emergencia Médica',
        logoText: 'VIDA',
        foregroundColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgb(30, 64, 175)', // vida-600
        labelColor: 'rgb(191, 219, 254)', // vida-200

        generic: {
          primaryFields: [
            {
              key: 'name',
              label: 'PACIENTE',
              value: data.name,
            },
          ],
          secondaryFields,
          backFields,
        },

        barcode: {
          format: 'PKBarcodeFormatQR',
          message: data.emergencyUrl,
          messageEncoding: 'iso-8859-1',
          altText: 'Escanear para emergencia',
        },

        // NFC para iOS 13+
        nfc: {
          message: data.emergencyUrl,
          encryptionPublicKey: '', // Opcional
        },
      } as any
    );

    // Agregar iconos (si existen)
    const iconPath = path.join(this.templatesPath, 'icon.png');
    const icon2xPath = path.join(this.templatesPath, 'icon@2x.png');
    const logoPath = path.join(this.templatesPath, 'logo.png');
    const logo2xPath = path.join(this.templatesPath, 'logo@2x.png');

    if (fs.existsSync(iconPath)) {
      pass.addBuffer('icon.png', fs.readFileSync(iconPath));
    }
    if (fs.existsSync(icon2xPath)) {
      pass.addBuffer('icon@2x.png', fs.readFileSync(icon2xPath));
    }
    if (fs.existsSync(logoPath)) {
      pass.addBuffer('logo.png', fs.readFileSync(logoPath));
    }
    if (fs.existsSync(logo2xPath)) {
      pass.addBuffer('logo@2x.png', fs.readFileSync(logo2xPath));
    }

    return pass.getAsBuffer();
  }

  /**
   * Genera un objeto de pase de Google Wallet (JWT)
   */
  async generateGooglePassJwt(data: EmergencyPassData): Promise<string> {
    if (!this.isGoogleWalletConfigured()) {
      throw new Error('Google Wallet no está configurado.');
    }

    const objectId = `${this.config.google.issuerId}.${data.id}`;

    // Crear el objeto del pase
    const genericObject = {
      id: objectId,
      classId: `${this.config.google.issuerId}.vida_emergency_class`,
      genericType: 'GENERIC_TYPE_UNSPECIFIED',
      hexBackgroundColor: '#1E40AF',
      logo: {
        sourceUri: {
          uri: 'https://sistemavida.mx/logo.png', // URL del logo
        },
      },
      cardTitle: {
        defaultValue: {
          language: 'es',
          value: 'Sistema VIDA',
        },
      },
      subheader: {
        defaultValue: {
          language: 'es',
          value: 'Tarjeta de Emergencia Médica',
        },
      },
      header: {
        defaultValue: {
          language: 'es',
          value: data.name,
        },
      },
      textModulesData: [
        ...(data.bloodType ? [{
          id: 'blood_type',
          header: 'TIPO DE SANGRE',
          body: data.bloodType,
        }] : []),
        ...(data.allergies?.length ? [{
          id: 'allergies',
          header: 'ALERGIAS',
          body: data.allergies.join(', '),
        }] : []),
        ...(data.conditions?.length ? [{
          id: 'conditions',
          header: 'CONDICIONES',
          body: data.conditions.slice(0, 3).join(', '),
        }] : []),
        ...(data.emergencyContact ? [{
          id: 'emergency_contact',
          header: 'CONTACTO DE EMERGENCIA',
          body: `${data.emergencyContact.name}: ${data.emergencyContact.phone}`,
        }] : []),
      ],
      barcode: {
        type: 'QR_CODE',
        value: data.emergencyUrl,
        alternateText: 'Escanear para emergencia',
      },
      linksModuleData: {
        uris: [
          {
            uri: data.emergencyUrl,
            description: 'Ver perfil completo',
            id: 'profile_link',
          },
        ],
      },
    };

    // Crear el payload del JWT
    const claims = {
      iss: this.config.google.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        genericObjects: [genericObject],
      },
      origins: [config.frontendUrl],
    };

    // Firmar el JWT
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(this.config.google.privateKey, 'base64url');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Genera la URL de "Add to Google Wallet"
   */
  async getGoogleWalletUrl(data: EmergencyPassData): Promise<string> {
    const jwt = await this.generateGooglePassJwt(data);
    return `https://pay.google.com/gp/v/save/${jwt}`;
  }

  /**
   * Obtiene el estado de configuración de los wallets
   */
  getStatus(): {
    appleWallet: { configured: boolean; passTypeId: string };
    googleWallet: { configured: boolean; issuerId: string };
  } {
    return {
      appleWallet: {
        configured: this.isAppleWalletConfigured(),
        passTypeId: this.config.apple.passTypeId,
      },
      googleWallet: {
        configured: this.isGoogleWalletConfigured(),
        issuerId: this.config.google.issuerId,
      },
    };
  }
}

export const walletService = new WalletService();
export default walletService;
