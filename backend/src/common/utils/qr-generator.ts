// src/common/utils/qr-generator.ts
import QRCode from 'qrcode';
import config from '../../config';

interface QRGenerationResult {
  qrToken: string;
  qrDataUrl: string;  // Base64 de la imagen
  emergencyUrl: string;
}

/**
 * Genera un código QR para acceso de emergencia
 * @param qrToken - Token único del paciente
 * @returns Objeto con el token, imagen en base64 y URL de emergencia
 */
export async function generateEmergencyQR(qrToken: string): Promise<QRGenerationResult> {
  // URL que escaneará el personal de emergencia
  const emergencyUrl = `${config.frontendUrl}/emergency/${qrToken}`;
  
  // Opciones de generación del QR
  const options: QRCode.QRCodeToDataURLOptions = {
    type: 'image/png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1E40AF',  // Azul VIDA
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H', // Alta corrección de errores
  };
  
  // Generar la imagen en base64
  const qrDataUrl = await QRCode.toDataURL(emergencyUrl, options);
  
  return {
    qrToken,
    qrDataUrl,
    emergencyUrl,
  };
}

/**
 * Genera un QR como Buffer (para guardar como archivo)
 */
export async function generateQRBuffer(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    type: 'png',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
  });
}

/**
 * Genera un QR como string SVG
 */
export async function generateQRSVG(data: string): Promise<string> {
  return await QRCode.toString(data, {
    type: 'svg',
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
  });
}
