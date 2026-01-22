// src/components/pages/AccessHistory.tsx
import { useState, useEffect } from 'react';
import { emergencyApi } from '../../services/api';
import type { EmergencyAccess } from '../../types';

export default function AccessHistory() {
  const [accesses, setAccesses] = useState<EmergencyAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await emergencyApi.getHistory();
        if (res.success && res.data) {
          setAccesses(res.data.accesses);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Error al cargar el historial');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      DOCTOR: 'Medico',
      PARAMEDIC: 'Paramedico',
      NURSE: 'Enfermero(a)',
      EMERGENCY_TECH: 'Tecnico en urgencias',
      OTHER: 'Otro personal de salud',
    };
    return roles[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-vida-200 border-t-vida-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Accesos de Emergencia</h1>
        <p className="text-gray-600 mt-1">
          Registro de todas las veces que personal medico ha accedido a tu informacion
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-vida-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-vida-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{accesses.length}</p>
            <p className="text-gray-500">Accesos totales registrados</p>
          </div>
        </div>
      </div>

      {/* Access List */}
      {accesses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin accesos registrados</h3>
          <p className="text-gray-500">
            Aun no se ha accedido a tu informacion de emergencia.
            Esto es bueno - significa que no has tenido emergencias.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accesses.map((access) => (
            <div
              key={access.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{access.accessorName}</h3>
                      <p className="text-sm text-gray-500">{getRoleLabel(access.accessorRole)}</p>
                      {access.institutionName && (
                        <p className="text-sm text-gray-500">{access.institutionName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(access.accessedAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(access.accessedAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Location */}
                {access.locationName && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {access.locationName}
                  </div>
                )}

                {/* Data accessed */}
                {access.dataAccessed && access.dataAccessed.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Datos consultados:</p>
                    <div className="flex flex-wrap gap-2">
                      {access.dataAccessed.map((item, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sobre este historial
        </h3>
        <p className="text-blue-700 text-sm">
          Cada vez que alguien escanea tu codigo QR y accede a tu informacion de emergencia,
          el acceso queda registrado aqui. Tus representantes tambien son notificados automaticamente.
          Si ves un acceso que no reconoces, contacta a soporte.
        </p>
      </div>
    </div>
  );
}
