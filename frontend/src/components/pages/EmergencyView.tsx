// src/components/pages/EmergencyView.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { emergencyApi } from '../../services/api';
import type { EmergencyData } from '../../types';

// Roles que requieren cédula profesional obligatoria
const ROLES_REQUIRING_LICENSE = ['DOCTOR', 'NURSE'];
// Roles donde la cédula es recomendada pero no obligatoria
const ROLES_LICENSE_RECOMMENDED = ['PARAMEDIC', 'EMERGENCY_TECH'];

// Validación de formato de cédula profesional mexicana (7-8 dígitos)
const validateLicenseFormat = (license: string): boolean => {
  if (!license) return false;
  const cleaned = license.replace(/[\s-]/g, '');
  return /^\d{7,8}$/.test(cleaned);
};

export default function EmergencyView() {
  const { qrToken } = useParams<{ qrToken: string }>();

  const [step, setStep] = useState<'form' | 'loading' | 'data' | 'error'>('form');
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [error, setError] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [licenseError, setLicenseError] = useState('');

  const [accessorForm, setAccessorForm] = useState({
    accessorName: '',
    accessorRole: 'DOCTOR',
    accessorLicense: '',
    institutionName: '',
  });

  // Determinar si el rol actual requiere cédula
  const licenseRequired = useMemo(() =>
    ROLES_REQUIRING_LICENSE.includes(accessorForm.accessorRole),
    [accessorForm.accessorRole]
  );

  const licenseRecommended = useMemo(() =>
    ROLES_LICENSE_RECOMMENDED.includes(accessorForm.accessorRole),
    [accessorForm.accessorRole]
  );

  // Validar cédula cuando cambia
  useEffect(() => {
    if (accessorForm.accessorLicense) {
      if (!validateLicenseFormat(accessorForm.accessorLicense)) {
        setLicenseError('Formato inválido (debe ser 7-8 dígitos)');
      } else {
        setLicenseError('');
      }
    } else if (licenseRequired) {
      setLicenseError('La cédula profesional es requerida para este rol');
    } else {
      setLicenseError('');
    }
  }, [accessorForm.accessorLicense, accessorForm.accessorRole, licenseRequired]);

  // Timer para mostrar tiempo restante
  useEffect(() => {
    if (!expiresAt) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Expirado');
        setStep('error');
        setError('La sesión de acceso ha expirado');
        clearInterval(interval);
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Obtener ubicación automáticamente
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => console.log('Ubicación no disponible')
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!qrToken) {
      setError('Token QR inválido');
      setStep('error');
      return;
    }

    // Validar cédula si es requerida
    if (licenseRequired) {
      if (!accessorForm.accessorLicense) {
        setLicenseError('La cédula profesional es requerida para este rol');
        return;
      }
      if (!validateLicenseFormat(accessorForm.accessorLicense)) {
        setLicenseError('Formato de cédula inválido (debe ser 7-8 dígitos)');
        return;
      }
    }

    // Validar formato si se proporcionó cédula
    if (accessorForm.accessorLicense && !validateLicenseFormat(accessorForm.accessorLicense)) {
      setLicenseError('Formato de cédula inválido (debe ser 7-8 dígitos)');
      return;
    }

    setStep('loading');

    try {
      const res = await emergencyApi.initiateAccess({
        qrToken,
        accessorName: accessorForm.accessorName,
        accessorRole: accessorForm.accessorRole,
        accessorLicense: accessorForm.accessorLicense || undefined,
        institutionName: accessorForm.institutionName || undefined,
        latitude: location?.lat,
        longitude: location?.lng,
        locationName: location?.name,
      });

      if (res.success && res.data) {
        setEmergencyData(res.data);
        setExpiresAt(new Date(res.data.expiresAt));
        setStep('data');
      } else {
        throw new Error('Error al acceder');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'No se pudo acceder a los datos del paciente';
      // Mostrar detalles adicionales si hay errores de credenciales
      const errorDetails = err.response?.data?.error?.details;
      if (errorDetails && Array.isArray(errorDetails)) {
        setError(`${errorMessage}: ${errorDetails.join(', ')}`);
      } else {
        setError(errorMessage);
      }
      setStep('error');
    }
  };

  // Vista de formulario de acceso
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-red-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema VIDA</h1>
            <p className="text-gray-600 mt-2">Acceso de Emergencia</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>⚠️ Aviso:</strong> Este acceso quedará registrado con sus datos,
              ubicación y hora. Solo personal médico autorizado debe usar este sistema.
            </p>
            <p className="text-xs text-yellow-700">
              <strong>Nota:</strong> Médicos y enfermeros deben proporcionar su cédula profesional.
              Las credenciales serán verificadas y registradas.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={accessorForm.accessorName}
                onChange={(e) => setAccessorForm({ ...accessorForm, accessorName: e.target.value })}
                placeholder="Dr. Juan Pérez García"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol / Especialidad *
              </label>
              <select
                required
                value={accessorForm.accessorRole}
                onChange={(e) => setAccessorForm({ ...accessorForm, accessorRole: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="DOCTOR">Médico</option>
                <option value="PARAMEDIC">Paramédico</option>
                <option value="NURSE">Enfermero(a)</option>
                <option value="EMERGENCY_TECH">Técnico en urgencias</option>
                <option value="OTHER">Otro personal de salud</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cédula profesional {licenseRequired && <span className="text-red-500">*</span>}
                {licenseRecommended && !licenseRequired && (
                  <span className="text-yellow-600 text-xs ml-1">(recomendada)</span>
                )}
              </label>
              <input
                type="text"
                required={licenseRequired}
                value={accessorForm.accessorLicense}
                onChange={(e) => setAccessorForm({ ...accessorForm, accessorLicense: e.target.value })}
                placeholder="1234567"
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  licenseError && accessorForm.accessorLicense
                    ? 'border-red-500 bg-red-50'
                    : accessorForm.accessorLicense && !licenseError
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300'
                }`}
              />
              {licenseError && (
                <p className="text-red-500 text-xs mt-1">{licenseError}</p>
              )}
              {accessorForm.accessorLicense && !licenseError && (
                <p className="text-green-600 text-xs mt-1">Formato de cédula válido</p>
              )}
              {licenseRecommended && !accessorForm.accessorLicense && (
                <p className="text-yellow-600 text-xs mt-1">
                  Se recomienda proporcionar cédula para mayor seguridad
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institución
              </label>
              <input
                type="text"
                value={accessorForm.institutionName}
                onChange={(e) => setAccessorForm({ ...accessorForm, institutionName: e.target.value })}
                placeholder="Hospital General de México"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {location && (
              <p className="text-xs text-gray-500">
                📍 Ubicación detectada: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
            )}

            <button
              type="submit"
              disabled={licenseRequired && (!accessorForm.accessorLicense || !!licenseError)}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                licenseRequired && (!accessorForm.accessorLicense || licenseError)
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {licenseRequired && !accessorForm.accessorLicense
                ? 'Ingrese cédula profesional para continuar'
                : 'Acceder a datos de emergencia'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Vista de carga
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-red-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Vista de error
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error de acceso</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setStep('form');
              setError('');
            }}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Vista de datos de emergencia
  if (!emergencyData) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header fijo con timer */}
      <div className="sticky top-0 z-50 bg-red-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-bold text-lg">ACCESO DE EMERGENCIA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">Sesión expira en:</span>
            <span className="bg-white text-red-600 px-3 py-1 rounded-full font-mono font-bold">
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Información del paciente */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold">Información del Paciente</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-6">
              {emergencyData.patient.photoUrl && (
                <img
                  src={emergencyData.patient.photoUrl}
                  alt="Foto del paciente"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                />
              )}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="text-lg font-semibold">{emergencyData.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de nacimiento</p>
                  <p className="text-lg font-semibold">
                    {emergencyData.patient.dateOfBirth 
                      ? new Date(emergencyData.patient.dateOfBirth).toLocaleDateString('es-MX')
                      : 'No disponible'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sexo</p>
                  <p className="text-lg font-semibold">
                    {emergencyData.patient.sex === 'M' ? 'Masculino' : 
                     emergencyData.patient.sex === 'F' ? 'Femenino' : 'No especificado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tipo de sangre</p>
                  <p className="text-2xl font-bold text-red-600">
                    {emergencyData.medicalInfo.bloodType || 'No registrado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información médica crítica */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Alergias */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-orange-500 text-white px-4 py-3">
              <h3 className="font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                ALERGIAS
              </h3>
            </div>
            <div className="p-4">
              {emergencyData.medicalInfo.allergies.length > 0 ? (
                <ul className="space-y-2">
                  {emergencyData.medicalInfo.allergies.map((allergy, i) => (
                    <li key={i} className="flex items-center gap-2 text-orange-700 font-medium">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      {allergy}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic">Sin alergias registradas</p>
              )}
            </div>
          </div>

          {/* Condiciones */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-purple-500 text-white px-4 py-3">
              <h3 className="font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CONDICIONES
              </h3>
            </div>
            <div className="p-4">
              {emergencyData.medicalInfo.conditions.length > 0 ? (
                <ul className="space-y-2">
                  {emergencyData.medicalInfo.conditions.map((condition, i) => (
                    <li key={i} className="flex items-center gap-2 text-purple-700">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      {condition}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic">Sin condiciones registradas</p>
              )}
            </div>
          </div>

          {/* Medicamentos */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-green-500 text-white px-4 py-3">
              <h3 className="font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                MEDICAMENTOS
              </h3>
            </div>
            <div className="p-4">
              {emergencyData.medicalInfo.medications.length > 0 ? (
                <ul className="space-y-2">
                  {emergencyData.medicalInfo.medications.map((med, i) => (
                    <li key={i} className="flex items-center gap-2 text-green-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {med}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 italic">Sin medicamentos registrados</p>
              )}
            </div>
          </div>
        </div>

        {/* Voluntad anticipada */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gray-800 text-white px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              VOLUNTAD ANTICIPADA
            </h2>
          </div>
          <div className="p-6">
            {emergencyData.directive.hasActiveDirective ? (
              <>
                <div className="mb-4 flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    ✓ Directiva Activa
                  </span>
                  {emergencyData.directive.validatedAt && (
                    <span className="text-sm text-gray-500">
                      Validada el {new Date(emergencyData.directive.validatedAt).toLocaleDateString('es-MX')}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-lg text-center ${
                    emergencyData.directive.acceptsCPR 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : emergencyData.directive.acceptsCPR === false
                        ? 'bg-red-100 border-2 border-red-500'
                        : 'bg-gray-100'
                  }`}>
                    <p className="text-sm font-medium mb-1">RCP</p>
                    <p className={`text-2xl font-bold ${
                      emergencyData.directive.acceptsCPR ? 'text-green-600' :
                      emergencyData.directive.acceptsCPR === false ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {emergencyData.directive.acceptsCPR ? 'SÍ' : 
                       emergencyData.directive.acceptsCPR === false ? 'NO' : '—'}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-lg text-center ${
                    emergencyData.directive.acceptsIntubation 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : emergencyData.directive.acceptsIntubation === false
                        ? 'bg-red-100 border-2 border-red-500'
                        : 'bg-gray-100'
                  }`}>
                    <p className="text-sm font-medium mb-1">Intubación</p>
                    <p className={`text-2xl font-bold ${
                      emergencyData.directive.acceptsIntubation ? 'text-green-600' :
                      emergencyData.directive.acceptsIntubation === false ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {emergencyData.directive.acceptsIntubation ? 'SÍ' : 
                       emergencyData.directive.acceptsIntubation === false ? 'NO' : '—'}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg text-center bg-blue-100 border-2 border-blue-500">
                    <p className="text-sm font-medium mb-1">Solo Paliativo</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {emergencyData.directive.palliativeCareOnly ? 'SÍ' : 'NO'}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg text-center bg-gray-100">
                    <p className="text-sm font-medium mb-1">Documento</p>
                    {emergencyData.directive.documentUrl ? (
                      <a
                        href={emergencyData.directive.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver PDF
                      </a>
                    ) : (
                      <p className="text-gray-400">Digital</p>
                    )}
                  </div>
                </div>

                {emergencyData.directive.additionalNotes && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Notas adicionales:</p>
                    <p className="text-yellow-700">{emergencyData.directive.additionalNotes}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">El paciente no tiene voluntad anticipada registrada</p>
              </div>
            )}
          </div>
        </div>

        {/* Donación de órganos */}
        <div className={`rounded-xl shadow-sm overflow-hidden ${
          emergencyData.donation.isDonor ? 'bg-teal-50 border-2 border-teal-500' : 'bg-white'
        }`}>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                emergencyData.donation.isDonor ? 'bg-teal-500' : 'bg-gray-200'
              }`}>
                <svg className={`w-6 h-6 ${emergencyData.donation.isDonor ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold">Donación de Órganos</h3>
                <p className={emergencyData.donation.isDonor ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                  {emergencyData.donation.isDonor ? '✓ El paciente es donador registrado' : 'No es donador registrado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentos médicos */}
        {emergencyData.documents && emergencyData.documents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-amber-600 text-white px-6 py-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Documentos Médicos
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {emergencyData.documents.map((doc) => {
                const categoryLabels: Record<string, string> = {
                  CLINICAL_HISTORY: 'Historial Clínico',
                  LAB_RESULTS: 'Laboratorio',
                  IMAGING: 'Imagen',
                  PRESCRIPTIONS: 'Receta',
                  DISCHARGE_SUMMARY: 'Alta',
                  SURGICAL_REPORT: 'Cirugía',
                  VACCINATION: 'Vacunación',
                  INSURANCE: 'Seguro',
                  IDENTIFICATION: 'ID',
                  OTHER: 'Otro',
                };
                const categoryColors: Record<string, string> = {
                  CLINICAL_HISTORY: 'bg-blue-100 text-blue-700',
                  LAB_RESULTS: 'bg-purple-100 text-purple-700',
                  IMAGING: 'bg-cyan-100 text-cyan-700',
                  PRESCRIPTIONS: 'bg-green-100 text-green-700',
                  DISCHARGE_SUMMARY: 'bg-orange-100 text-orange-700',
                  SURGICAL_REPORT: 'bg-red-100 text-red-700',
                  VACCINATION: 'bg-yellow-100 text-yellow-700',
                  INSURANCE: 'bg-indigo-100 text-indigo-700',
                  IDENTIFICATION: 'bg-gray-100 text-gray-700',
                  OTHER: 'bg-gray-100 text-gray-700',
                };
                const isPdf = doc.fileType === 'application/pdf';
                const isImage = doc.fileType.startsWith('image/');

                return (
                  <div key={doc.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isPdf ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {isPdf ? (
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        ) : isImage ? (
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[doc.category] || 'bg-gray-100 text-gray-700'}`}>
                            {categoryLabels[doc.category] || doc.category}
                          </span>
                          {doc.institution && (
                            <span className="text-xs text-gray-500">{doc.institution}</span>
                          )}
                          {doc.documentDate && (
                            <span className="text-xs text-gray-400">
                              {new Date(doc.documentDate).toLocaleDateString('es-MX')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Ver
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contactos de emergencia */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-indigo-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Contactos de Emergencia
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {emergencyData.representatives.length > 0 ? (
              emergencyData.representatives.map((rep, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{rep.name}</p>
                      <p className="text-sm text-gray-500">{rep.relation}</p>
                    </div>
                  </div>
                  <a
                    href={`tel:${rep.phone}`}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {rep.phone}
                  </a>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400">
                No hay contactos de emergencia registrados
              </div>
            )}
          </div>
        </div>

        {/* Footer con aviso legal */}
        <div className="bg-gray-800 text-white rounded-xl p-6 text-center text-sm">
          <p className="mb-2">
            Este acceso ha sido registrado y los representantes del paciente han sido notificados.
          </p>
          <p className="text-gray-400">
            Sistema VIDA - Información consultada el {new Date().toLocaleString('es-MX')}
          </p>
        </div>
      </div>
    </div>
  );
}
