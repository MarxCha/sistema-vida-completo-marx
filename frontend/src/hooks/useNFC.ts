// src/hooks/useNFC.ts
import { useState, useCallback } from 'react';
import i18next from 'i18next';

interface NFCWriteResult {
  success: boolean;
  error?: string;
}

interface NFCReadResult {
  success: boolean;
  url?: string;
  records?: NFCRecord[];
  error?: string;
}

interface NFCRecord {
  recordType: string;
  data: string;
}

interface UseNFCReturn {
  isSupported: boolean;
  isWriting: boolean;
  isReading: boolean;
  writeUrl: (url: string) => Promise<NFCWriteResult>;
  writeEmergencyData: (data: EmergencyNFCData) => Promise<NFCWriteResult>;
  readTag: () => Promise<NFCReadResult>;
  cancelOperation: () => void;
}

export interface EmergencyNFCData {
  url: string;
  name: string;
  bloodType?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
  };
  conditions?: string[];
}

// Verificar si Web NFC está soportado
const isNFCSupported = (): boolean => {
  return 'NDEFReader' in window;
};

export function useNFC(): UseNFCReturn {
  const [isWriting, setIsWriting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const isSupported = isNFCSupported();

  /**
   * Escribe solo una URL en el tag NFC
   * Compatible con cualquier teléfono que lea NFC
   */
  const writeUrl = useCallback(async (url: string): Promise<NFCWriteResult> => {
    if (!isSupported) {
      return { success: false, error: i18next.t('extras:nfc.errors.notSupported') };
    }

    setIsWriting(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const ndef = new (window as any).NDEFReader();

      await ndef.write(
        {
          records: [
            {
              recordType: 'url',
              data: url,
            },
          ],
        },
        { signal: controller.signal }
      );

      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: i18next.t('extras:nfc.errors.cancelled') };
      }
      if (error.name === 'NotAllowedError') {
        return { success: false, error: i18next.t('extras:nfc.errors.permissionDenied') };
      }
      if (error.name === 'NotSupportedError') {
        return { success: false, error: i18next.t('extras:nfc.errors.notSupported') };
      }
      return { success: false, error: error.message || i18next.t('extras:nfc.errors.writeError2') };
    } finally {
      setIsWriting(false);
      setAbortController(null);
    }
  }, [isSupported]);

  /**
   * Escribe datos de emergencia completos en el tag NFC
   * Incluye URL + datos básicos para acceso offline
   */
  const writeEmergencyData = useCallback(async (data: EmergencyNFCData): Promise<NFCWriteResult> => {
    if (!isSupported) {
      return { success: false, error: i18next.t('extras:nfc.errors.notSupported') };
    }

    setIsWriting(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const ndef = new (window as any).NDEFReader();

      // Crear texto con datos básicos de emergencia
      const emergencyText = [
        `🏥 EMERGENCIA MÉDICA - Sistema VIDA`,
        `👤 ${data.name}`,
        data.bloodType ? `🩸 Tipo de sangre: ${data.bloodType}` : '',
        data.allergies?.length ? `⚠️ Alergias: ${data.allergies.join(', ')}` : '',
        data.conditions?.length ? `💊 Condiciones: ${data.conditions.join(', ')}` : '',
        data.emergencyContact ? `📞 Contacto: ${data.emergencyContact.name} - ${data.emergencyContact.phone}` : '',
        ``,
        `📱 Escanea para ver perfil completo`,
      ].filter(Boolean).join('\n');

      await ndef.write(
        {
          records: [
            // Registro 1: URL para abrir perfil completo
            {
              recordType: 'url',
              data: data.url,
            },
            // Registro 2: Texto con datos básicos (visible sin internet)
            {
              recordType: 'text',
              data: emergencyText,
              lang: 'es',
            },
            // Registro 3: Datos estructurados en JSON (para apps que lo soporten)
            {
              recordType: 'mime',
              mediaType: 'application/json',
              data: new TextEncoder().encode(JSON.stringify({
                type: 'vida-emergency',
                version: '1.0',
                name: data.name,
                bloodType: data.bloodType,
                allergies: data.allergies,
                conditions: data.conditions,
                emergencyContact: data.emergencyContact,
                url: data.url,
              })),
            },
          ],
        },
        { signal: controller.signal }
      );

      return { success: true };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: i18next.t('extras:nfc.errors.cancelled') };
      }
      if (error.name === 'NotAllowedError') {
        return { success: false, error: i18next.t('extras:nfc.errors.permissionDenied') };
      }
      return { success: false, error: error.message || i18next.t('extras:nfc.errors.writeError2') };
    } finally {
      setIsWriting(false);
      setAbortController(null);
    }
  }, [isSupported]);

  /**
   * Lee un tag NFC
   */
  const readTag = useCallback(async (): Promise<NFCReadResult> => {
    if (!isSupported) {
      return { success: false, error: i18next.t('extras:nfc.errors.notSupported') };
    }

    setIsReading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const ndef = new (window as any).NDEFReader();

      return new Promise((resolve) => {
        ndef.addEventListener('reading', ({ message }: any) => {
          const records: NFCRecord[] = [];
          let url: string | undefined;

          for (const record of message.records) {
            if (record.recordType === 'url') {
              const decoder = new TextDecoder();
              url = decoder.decode(record.data);
            }
            records.push({
              recordType: record.recordType,
              data: record.recordType === 'text' || record.recordType === 'url'
                ? new TextDecoder().decode(record.data)
                : '[binary data]',
            });
          }

          setIsReading(false);
          setAbortController(null);
          resolve({ success: true, url, records });
        });

        ndef.addEventListener('readingerror', () => {
          setIsReading(false);
          setAbortController(null);
          resolve({ success: false, error: i18next.t('extras:nfc.errors.readError') });
        });

        ndef.scan({ signal: controller.signal }).catch((error: any) => {
          setIsReading(false);
          setAbortController(null);
          resolve({ success: false, error: error.message });
        });
      });
    } catch (error: any) {
      setIsReading(false);
      setAbortController(null);
      return { success: false, error: error.message || i18next.t('extras:nfc.errors.readStartError') };
    }
  }, [isSupported]);

  /**
   * Cancela la operación actual
   */
  const cancelOperation = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsWriting(false);
      setIsReading(false);
    }
  }, [abortController]);

  return {
    isSupported,
    isWriting,
    isReading,
    writeUrl,
    writeEmergencyData,
    readTag,
    cancelOperation,
  };
}

export default useNFC;
