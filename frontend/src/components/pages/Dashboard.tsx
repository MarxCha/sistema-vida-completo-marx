// src/components/pages/Dashboard.tsx
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { profileApi, directivesApi, representativesApi, emergencyApi, documentsApi } from '../../services/api';
import {
  User,
  FileText,
  Users,
  QrCode,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield,
  Heart,
  History,
  FolderOpen,
  Eye
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  // Queries
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.getProfile(),
  });

  const { data: directivesData, isLoading: loadingDirectives } = useQuery({
    queryKey: ['directives', 'active'],
    queryFn: () => directivesApi.getActive(),
  });

  const { data: representativesData, isLoading: loadingReps } = useQuery({
    queryKey: ['representatives'],
    queryFn: () => representativesApi.list(),
  });

  const { data: historyData } = useQuery({
    queryKey: ['emergency', 'history'],
    queryFn: () => emergencyApi.getHistory(),
  });

  const { data: documentsData } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list(),
  });

  const profile = profileData?.data?.profile;
  const hasActiveDirective = directivesData?.data?.hasActiveDirective;
  const representatives = representativesData?.data?.representatives || [];
  const recentAccesses = historyData?.data?.accesses?.slice(0, 3) || [];
  const documents = documentsData?.data?.documents || [];
  const visibleDocuments = documents.filter((doc: any) => doc.isVisible);
  const recentDocuments = documents.slice(0, 3);

  // Calcular estado de completitud del perfil
  const profileCompleteness = (() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.bloodType) score += 25;
    if (profile.allergies.length > 0 || profile.conditions.length > 0) score += 25;
    if (profile.medications.length > 0) score += 25;
    if (representatives.length > 0) score += 25;
    return score;
  })();

  const isLoading = loadingProfile || loadingDirectives || loadingReps;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl"></div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header de bienvenida */}
      <div className="card bg-gradient-to-r from-vida-600 to-vida-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              ¡Hola, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-vida-100">
              Bienvenido a tu panel de control VIDA
            </p>
          </div>
          <Link 
            to="/emergency-qr" 
            className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <QrCode className="w-5 h-5" />
            Ver mi QR de emergencia
          </Link>
        </div>
      </div>

      {/* Alertas si falta completar algo */}
      {profileCompleteness < 100 && (
        <div className="alert-warning">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Tu perfil está incompleto ({profileCompleteness}%)</p>
            <p className="text-sm mt-1">
              Completa tu información médica para que esté disponible en emergencias.
            </p>
          </div>
          <Link to="/profile" className="btn-secondary text-sm ml-auto whitespace-nowrap">
            Completar
          </Link>
        </div>
      )}

      {!hasActiveDirective && (
        <div className="alert-info">
          <FileText className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">No tienes una voluntad anticipada activa</p>
            <p className="text-sm mt-1">
              Crea tu voluntad anticipada para garantizar que tus decisiones sean respetadas.
            </p>
          </div>
          <Link to="/directives/new" className="btn-primary text-sm ml-auto whitespace-nowrap">
            Crear ahora
          </Link>
        </div>
      )}

      {/* Cards de estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Perfil médico */}
        <Link to="/profile" className="card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-vida-100 rounded-xl">
              <User className="w-6 h-6 text-vida-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-vida-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Perfil Médico</h3>
          <div className="flex items-center gap-2 text-sm">
            {profileCompleteness === 100 ? (
              <>
                <CheckCircle className="w-4 h-4 text-salud-500" />
                <span className="text-salud-600">Completo</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600">{profileCompleteness}% completado</span>
              </>
            )}
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-vida-500 h-2 rounded-full transition-all"
              style={{ width: `${profileCompleteness}%` }}
            ></div>
          </div>
        </Link>

        {/* Voluntad Anticipada */}
        <Link to="/directives" className="card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-coral-100 rounded-xl">
              <FileText className="w-6 h-6 text-coral-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-coral-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Voluntad Anticipada</h3>
          <div className="flex items-center gap-2 text-sm">
            {hasActiveDirective ? (
              <>
                <CheckCircle className="w-4 h-4 text-salud-500" />
                <span className="text-salud-600">Activa</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600">Sin registrar</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {hasActiveDirective 
              ? 'Tu voluntad anticipada está protegida'
              : 'Registra tus preferencias médicas'}
          </p>
        </Link>

        {/* Representantes */}
        <Link to="/representatives" className="card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-salud-100 rounded-xl">
              <Users className="w-6 h-6 text-salud-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-salud-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Representantes</h3>
          <div className="flex items-center gap-2 text-sm">
            {representatives.length > 0 ? (
              <>
                <CheckCircle className="w-4 h-4 text-salud-500" />
                <span className="text-salud-600">{representatives.length} registrado{representatives.length > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-600">Sin registrar</span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {representatives.length > 0
              ? `${representatives[0]?.name} (primario)`
              : 'Designa a tus representantes'}
          </p>
        </Link>

        {/* Documentos Médicos */}
        <Link to="/documents" className="card-hover group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-amber-600" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Mis Documentos</h3>
          <div className="flex items-center gap-2 text-sm">
            {documents.length > 0 ? (
              <>
                <CheckCircle className="w-4 h-4 text-salud-500" />
                <span className="text-salud-600">{documents.length} documento{documents.length > 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Sin documentos</span>
              </>
            )}
          </div>
          {visibleDocuments.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
              <Eye className="w-3 h-3" />
              <span>{visibleDocuments.length} visible{visibleDocuments.length > 1 ? 's' : ''} en emergencias</span>
            </div>
          )}
          {documents.length === 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Sube tu historial clínico y estudios
            </p>
          )}
        </Link>
      </div>

      {/* Sección de información rápida */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Info médica destacada */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-coral-500" />
            <h3 className="font-semibold text-gray-900">Información Crítica</h3>
          </div>
          {profile ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Tipo de sangre</span>
                <span className="font-medium text-gray-900">
                  {profile.bloodType || <span className="text-gray-400">No especificado</span>}
                </span>
              </div>
              <div className="py-2 border-b border-gray-100">
                <span className="text-gray-600">Alergias</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {profile.allergies.length > 0 ? (
                    profile.allergies.map((allergy, i) => (
                      <span key={i} className="badge-danger">{allergy}</span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">Ninguna registrada</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Donador de órganos</span>
                <span className={`font-medium ${profile.isDonor ? 'text-salud-600' : 'text-gray-900'}`}>
                  {profile.isDonor ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Carga tu información médica para verla aquí</p>
          )}
        </div>

        {/* Historial de accesos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-vida-500" />
              <h3 className="font-semibold text-gray-900">Accesos Recientes</h3>
            </div>
            <Link to="/access-history" className="text-sm text-vida-600 hover:underline">
              Ver todo
            </Link>
          </div>
          {recentAccesses.length > 0 ? (
            <div className="space-y-3">
              {recentAccesses.map((access, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-vida-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-vida-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {access.accessorName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {access.accessorRole} • {access.institutionName || 'Institución no especificada'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(access.accessedAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Aún no hay accesos registrados</p>
            </div>
          )}
        </div>

        {/* Documentos recientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Documentos Recientes</h3>
            </div>
            <Link to="/documents" className="text-sm text-amber-600 hover:underline">
              Ver todos
            </Link>
          </div>
          {recentDocuments.length > 0 ? (
            <div className="space-y-3">
              {recentDocuments.map((doc: any, i: number) => {
                const categoryLabels: Record<string, string> = {
                  CLINICAL_HISTORY: 'Historial',
                  LAB_RESULTS: 'Lab',
                  IMAGING: 'Imagen',
                  PRESCRIPTIONS: 'Receta',
                  DISCHARGE_SUMMARY: 'Alta',
                  SURGICAL_REPORT: 'Cirugía',
                  VACCINATION: 'Vacuna',
                  INSURANCE: 'Seguro',
                  IDENTIFICATION: 'ID',
                  OTHER: 'Otro',
                };
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{categoryLabels[doc.category] || doc.category}</span>
                        {doc.isVisible && (
                          <span className="flex items-center gap-0.5 text-amber-600">
                            <Eye className="w-3 h-3" />
                            Visible
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No tienes documentos cargados</p>
              <Link to="/documents" className="text-sm text-amber-600 hover:underline mt-2 inline-block">
                Subir primer documento
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
