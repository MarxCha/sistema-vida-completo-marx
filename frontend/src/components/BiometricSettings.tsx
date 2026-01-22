// src/components/BiometricSettings.tsx
import { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { webauthnApi, WebAuthnCredential } from '../services/api';

interface BiometricSettingsProps {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export default function BiometricSettings({ onError, onSuccess }: BiometricSettingsProps) {
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar soporte de WebAuthn
    const supported = window.PublicKeyCredential !== undefined;
    setIsSupported(supported);

    if (supported) {
      loadCredentials();
    } else {
      setLoading(false);
    }
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await webauthnApi.listCredentials();
      if (response.success && response.data) {
        setCredentials(response.data);
      }
    } catch (error) {
      console.error('Error cargando credenciales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setRegistering(true);

      // 1. Obtener opciones de registro del servidor
      const optionsResponse = await webauthnApi.getRegistrationOptions();
      if (!optionsResponse.success || !optionsResponse.data) {
        throw new Error('No se pudieron obtener las opciones de registro');
      }

      // 2. Iniciar el proceso de registro en el dispositivo
      const credential = await startRegistration({ optionsJSON: optionsResponse.data });

      // 3. Verificar y guardar la credencial en el servidor
      const verifyResponse = await webauthnApi.verifyRegistration(credential);

      if (verifyResponse.success) {
        onSuccess?.('Autenticación biométrica configurada exitosamente');
        await loadCredentials();
      } else {
        throw new Error('No se pudo verificar la credencial');
      }
    } catch (error: any) {
      console.error('Error registrando biometría:', error);

      // Mensajes de error más amigables
      let errorMessage = 'Error al configurar la autenticación biométrica';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'El registro fue cancelado o no se permitió el acceso';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Este dispositivo no soporta autenticación biométrica';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Esta credencial ya está registrada';
      } else if (error.message) {
        errorMessage = error.message;
      }

      onError?.(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta credencial biométrica?')) {
      return;
    }

    try {
      setDeletingId(id);
      const response = await webauthnApi.deleteCredential(id);

      if (response.success) {
        onSuccess?.('Credencial eliminada exitosamente');
        await loadCredentials();
      }
    } catch (error) {
      console.error('Error eliminando credencial:', error);
      onError?.('Error al eliminar la credencial');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === 'singleDevice' || deviceType === 'platform') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    );
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800">
              Autenticación biométrica no disponible
            </h4>
            <p className="mt-1 text-sm text-yellow-700">
              Tu navegador o dispositivo no soporta autenticación biométrica (WebAuthn).
              Intenta usar Chrome, Safari, Firefox o Edge en un dispositivo con Face ID,
              Touch ID o Windows Hello.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-emerald-100 rounded-full p-3 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Autenticación Biométrica
            </h3>
            <p className="text-sm text-gray-500">
              Face ID, Touch ID o Windows Hello
            </p>
          </div>
        </div>

        <button
          onClick={handleRegister}
          disabled={registering}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {registering ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Configurando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar dispositivo
            </>
          )}
        </button>
      </div>

      {/* Descripción */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">
          Configura tu huella digital o reconocimiento facial para acceder de forma rápida y segura.
          Puedes registrar múltiples dispositivos.
        </p>
      </div>

      {/* Lista de credenciales */}
      {loading ? (
        <div className="flex justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-500">No tienes dispositivos biométricos configurados</p>
          <p className="text-sm text-gray-400 mt-1">
            Haz clic en "Agregar dispositivo" para configurar Face ID o Touch ID
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center">
                {getDeviceIcon(credential.deviceType)}
                <div className="ml-4">
                  <p className="font-medium text-gray-900">
                    {credential.deviceName || 'Dispositivo biométrico'}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span>Registrado: {formatDate(credential.createdAt)}</span>
                    {credential.lastUsedAt && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Último uso: {formatDate(credential.lastUsedAt)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(credential.id)}
                disabled={deletingId === credential.id}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Eliminar dispositivo"
              >
                {deletingId === credential.id ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Información de seguridad */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-gray-600">
              <strong className="text-gray-700">Tu seguridad es nuestra prioridad.</strong> Los datos biométricos nunca salen de tu dispositivo.
              Solo se almacena una clave criptográfica que verifica tu identidad.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
