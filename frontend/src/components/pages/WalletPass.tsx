// src/components/pages/WalletPass.tsx
import { useState, useEffect } from 'react';
import api from '../../services/api';

interface WalletStatus {
  appleWallet: {
    configured: boolean;
    passTypeId: string;
  };
  googleWallet: {
    configured: boolean;
    issuerId: string;
  };
}

export default function WalletPass() {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/wallet/status');
      if (response.data?.success) {
        setStatus(response.data.data);
      }
    } catch (err: any) {
      console.error('Error loading wallet status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleWallet = async () => {
    setDownloading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/wallet/apple-pass', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Error generando pase');
      }

      // Descargar el archivo .pkpass
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vida-emergencia.pkpass';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message || 'Error descargando pase de Apple Wallet');
    } finally {
      setDownloading(false);
    }
  };

  const handleGoogleWallet = async () => {
    setDownloading(true);
    setError('');

    try {
      const response = await api.get('/wallet/google-pass-url');
      if (response.data?.success && response.data?.data?.url) {
        window.open(response.data.data.url, '_blank');
      } else {
        throw new Error('No se pudo obtener la URL del pase');
      }
    } catch (err: any) {
      setError(err.message || 'Error generando pase de Google Wallet');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vida-600"></div>
      </div>
    );
  }

  const appleConfigured = status?.appleWallet.configured;
  const googleConfigured = status?.googleWallet.configured;
  const anyConfigured = appleConfigured || googleConfigured;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-vida-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tarjeta Digital</h1>
        <p className="text-gray-600 mt-2">
          Agrega tu tarjeta de emergencia a Apple Wallet o Google Wallet
        </p>
      </div>

      {/* Info */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
        <h3 className="font-semibold text-sky-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ¿Por qué usar la tarjeta digital?
        </h3>
        <ul className="text-sm text-sky-700 space-y-1">
          <li>• Acceso rápido desde la pantalla de bloqueo</li>
          <li>• Los paramédicos pueden escanear tu teléfono</li>
          <li>• No necesitas desbloquear el dispositivo</li>
          <li>• Funciona con NFC en iPhones modernos</li>
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Wallet Options */}
      {!anyConfigured ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="font-semibold text-amber-800 mb-2">No disponible aún</h3>
          <p className="text-sm text-amber-700">
            Los pases de wallet aún no están configurados en este servidor.
            Mientras tanto, puedes usar el código QR o tags NFC.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Apple Wallet */}
          <div className={`rounded-xl border-2 p-4 ${appleConfigured ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Apple Wallet</h3>
                <p className="text-sm text-gray-500">
                  {appleConfigured ? 'Para iPhone y Apple Watch' : 'No configurado'}
                </p>
              </div>
              {appleConfigured && (
                <button
                  onClick={handleAppleWallet}
                  disabled={downloading}
                  className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {downloading ? 'Descargando...' : 'Agregar'}
                </button>
              )}
            </div>
          </div>

          {/* Google Wallet */}
          <div className={`rounded-xl border-2 p-4 ${googleConfigured ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Google Wallet</h3>
                <p className="text-sm text-gray-500">
                  {googleConfigured ? 'Para Android y Wear OS' : 'No configurado'}
                </p>
              </div>
              {googleConfigured && (
                <button
                  onClick={handleGoogleWallet}
                  disabled={downloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {downloading ? 'Cargando...' : 'Agregar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-900 mb-3">¿Cómo funciona?</h3>
        <ol className="text-sm text-gray-600 space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-vida-100 text-vida-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
            <span>Agrega la tarjeta a tu wallet tocando el botón</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-vida-100 text-vida-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
            <span>La tarjeta aparecerá en tu app de Wallet</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-vida-100 text-vida-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
            <span>En emergencia, el personal médico puede escanear el código QR de la tarjeta</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-vida-100 text-vida-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
            <span>En iPhones, también pueden usar NFC (sin desbloquear)</span>
          </li>
        </ol>
      </div>

      {/* Requirements */}
      <div className="text-center text-xs text-gray-400 pt-4">
        <p>Apple Wallet requiere iOS 9+ • Google Wallet requiere Android 5+</p>
      </div>
    </div>
  );
}
