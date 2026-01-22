// src/components/admin/pages/AdminInstitutions.tsx
import React, { useState, useEffect } from 'react';
import {
  listInstitutions,
  listInsurance,
  verifyInstitution,
  verifyInsurance,
  getInstitutionStats,
  getInsuranceStats,
} from '../../../services/adminApi';
import {
  MedicalInstitution,
  InsuranceCompany,
  Pagination,
  InstitutionStats,
  InsuranceStats,
  INSURANCE_TYPE_LABELS,
  INSURANCE_TYPE_COLORS,
  InsuranceType,
} from '../../../types/admin';

type TabType = 'hospitals' | 'insurance';
type ViewMode = 'table' | 'cards';

const INSTITUTION_TYPE_LABELS: Record<string, string> = {
  HOSPITAL_PUBLIC: 'Hospital Publico',
  HOSPITAL_PRIVATE: 'Hospital Privado',
  CLINIC: 'Clinica',
  AMBULANCE_SERVICE: 'Ambulancias',
  IMSS: 'IMSS',
  ISSSTE: 'ISSSTE',
  OTHER: 'Otro',
};

const INSTITUTION_TYPE_COLORS: Record<string, string> = {
  HOSPITAL_PUBLIC: 'bg-blue-100 text-blue-700',
  HOSPITAL_PRIVATE: 'bg-purple-100 text-purple-700',
  CLINIC: 'bg-teal-100 text-teal-700',
  AMBULANCE_SERVICE: 'bg-red-100 text-red-700',
  IMSS: 'bg-green-100 text-green-700',
  ISSSTE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const AdminInstitutions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('hospitals');
  const [hospitalViewMode, setHospitalViewMode] = useState<ViewMode>('table');
  const [insuranceViewMode, setInsuranceViewMode] = useState<ViewMode>('table');

  // Hospitals state
  const [hospitals, setHospitals] = useState<MedicalInstitution[]>([]);
  const [hospitalPagination, setHospitalPagination] = useState<Pagination | null>(null);
  const [hospitalStats, setHospitalStats] = useState<InstitutionStats | null>(null);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalPage, setHospitalPage] = useState(1);

  // Insurance state
  const [insurances, setInsurances] = useState<InsuranceCompany[]>([]);
  const [insurancePagination, setInsurancePagination] = useState<Pagination | null>(null);
  const [insuranceStats, setInsuranceStats] = useState<InsuranceStats | null>(null);
  const [insuranceSearch, setInsuranceSearch] = useState('');
  const [insurancePage, setInsurancePage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);

  // Cargar stats de ambos al montar el componente
  useEffect(() => {
    loadHospitalStats();
    loadInsuranceStats();
  }, []);

  // Cargar datos según el tab activo
  useEffect(() => {
    if (activeTab === 'hospitals') {
      loadHospitals();
    } else {
      loadInsurances();
    }
  }, [activeTab, hospitalPage, insurancePage]);

  const loadHospitals = async () => {
    try {
      setIsLoading(true);
      const { institutions, pagination } = await listInstitutions({
        page: hospitalPage,
        limit: 15,
        search: hospitalSearch || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setHospitals(institutions);
      setHospitalPagination(pagination);
    } catch (error) {
      console.error('Error loading hospitals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHospitalStats = async () => {
    try {
      const stats = await getInstitutionStats();
      setHospitalStats(stats);
    } catch (error) {
      console.error('Error loading hospital stats:', error);
    }
  };

  const loadInsurances = async () => {
    try {
      setIsLoading(true);
      const { insurances: data, pagination } = await listInsurance({
        page: insurancePage,
        limit: 15,
        search: insuranceSearch || undefined,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setInsurances(data);
      setInsurancePagination(pagination);
    } catch (error) {
      console.error('Error loading insurances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsuranceStats = async () => {
    try {
      const stats = await getInsuranceStats();
      setInsuranceStats(stats);
    } catch (error) {
      console.error('Error loading insurance stats:', error);
    }
  };

  const handleHospitalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalPage(1);
    loadHospitals();
  };

  const handleInsuranceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setInsurancePage(1);
    loadInsurances();
  };

  const handleVerifyHospital = async (id: string, verified: boolean) => {
    try {
      await verifyInstitution(id, verified);
      loadHospitals();
      loadHospitalStats();
    } catch (error) {
      console.error('Error verifying hospital:', error);
    }
  };

  const handleVerifyInsurance = async (id: string, verified: boolean) => {
    try {
      await verifyInsurance(id, verified);
      loadInsurances();
      loadInsuranceStats();
    } catch (error) {
      console.error('Error verifying insurance:', error);
    }
  };

  // View Mode Toggle Component
  const ViewModeToggle: React.FC<{ viewMode: ViewMode; onChange: (mode: ViewMode) => void }> = ({ viewMode, onChange }) => (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('table')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'table'
            ? 'bg-white text-sky-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Vista de tabla"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
      <button
        onClick={() => onChange('cards')}
        className={`p-2 rounded-md transition-colors ${
          viewMode === 'cards'
            ? 'bg-white text-sky-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Vista de tarjetas"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
    </div>
  );

  // Hospital Card Component
  const HospitalCard: React.FC<{ hospital: MedicalInstitution }> = ({ hospital }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">{hospital.name}</h3>
          {hospital.cluesCode && (
            <p className="text-sm text-gray-500 mt-0.5">CLUES: {hospital.cluesCode}</p>
          )}
        </div>
        {hospital.isVerified ? (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verificado</span>
        ) : (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pendiente</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${INSTITUTION_TYPE_COLORS[hospital.type] || 'bg-gray-100 text-gray-700'}`}>
            {INSTITUTION_TYPE_LABELS[hospital.type] || hospital.type}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{hospital.city}, {hospital.state}</span>
        </div>

        {hospital.emergencyPhone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{hospital.emergencyPhone}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2">
          {hospital.hasEmergency && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Urgencias</span>
          )}
          {hospital.has24Hours && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">24 Horas</span>
          )}
          {hospital.hasICU && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">UCI</span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => handleVerifyHospital(hospital.id, !hospital.isVerified)}
          className={`text-sm font-medium ${hospital.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
        >
          {hospital.isVerified ? 'Quitar verificacion' : 'Verificar'}
        </button>
      </div>
    </div>
  );

  // Insurance Card Component
  const InsuranceCard: React.FC<{ insurance: InsuranceCompany }> = ({ insurance }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg">
            {insurance.shortName && <span className="text-sky-600">{insurance.shortName}</span>}
            {insurance.shortName && ' - '}
            {insurance.name}
          </h3>
          {insurance.cnsfNumber && (
            <p className="text-sm text-gray-500 mt-0.5">CNSF: {insurance.cnsfNumber}</p>
          )}
        </div>
        {insurance.isVerified ? (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verificada</span>
        ) : (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pendiente</span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${INSURANCE_TYPE_COLORS[insurance.type as InsuranceType] || 'bg-gray-100 text-gray-800'}`}>
            {INSURANCE_TYPE_LABELS[insurance.type as InsuranceType] || insurance.type}
          </span>
        </div>

        {insurance.emergencyPhone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{insurance.emergencyPhone}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {insurance.hasNationalCoverage && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Cobertura Nacional</span>
          )}
          {insurance.coverageTypes?.slice(0, 3).map((type, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">{type}</span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{insurance._count?.networkHospitals || 0}</p>
            <p className="text-xs text-gray-500">Hospitales en red</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{insurance._count?.plans || 0}</p>
            <p className="text-xs text-gray-500">Planes activos</p>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={() => handleVerifyInsurance(insurance.id, !insurance.isVerified)}
          className={`text-sm font-medium ${insurance.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
        >
          {insurance.isVerified ? 'Quitar verificacion' : 'Verificar'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Instituciones</h1>
        <p className="text-gray-500">Gestion de hospitales y aseguradoras</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'hospitals'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Hospitales
              {hospitalStats && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {hospitalStats.total}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('insurance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insurance'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Aseguradoras
              {insuranceStats && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {insuranceStats.total}
                </span>
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Hospitals Tab */}
      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          {/* Stats */}
          {hospitalStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Hospitales" value={hospitalStats.total} color="blue" />
              <StatCard label="Verificados" value={hospitalStats.verified} color="green" />
              <StatCard label="Con Urgencias" value={hospitalStats.withEmergency} color="red" />
              <StatCard label="24 Horas" value={hospitalStats.with24Hours} color="purple" />
            </div>
          )}

          {/* Search and View Toggle */}
          <form onSubmit={handleHospitalSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre, CLUES, ciudad..."
              value={hospitalSearch}
              onChange={(e) => setHospitalSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Buscar
            </button>
            <ViewModeToggle viewMode={hospitalViewMode} onChange={setHospitalViewMode} />
          </form>

          {/* Content */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          ) : hospitalViewMode === 'cards' ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map((hospital) => (
                <HospitalCard key={hospital.id} hospital={hospital} />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicacion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicios</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {hospitals.map((hospital) => (
                    <tr key={hospital.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{hospital.name}</p>
                          {hospital.cluesCode && (
                            <p className="text-sm text-gray-500">CLUES: {hospital.cluesCode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${INSTITUTION_TYPE_COLORS[hospital.type] || 'bg-gray-100 text-gray-700'}`}>
                          {INSTITUTION_TYPE_LABELS[hospital.type] || hospital.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{hospital.city}, {hospital.state}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {hospital.hasEmergency && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Urgencias</span>
                          )}
                          {hospital.has24Hours && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">24h</span>
                          )}
                          {hospital.hasICU && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">UCI</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hospital.isVerified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Verificado</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleVerifyHospital(hospital.id, !hospital.isVerified)}
                          className={`text-sm ${hospital.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {hospital.isVerified ? 'Quitar verificacion' : 'Verificar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {hospitalPagination && hospitalPagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {((hospitalPage - 1) * 15) + 1} - {Math.min(hospitalPage * 15, hospitalPagination.total)} de {hospitalPagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setHospitalPage(p => Math.max(1, p - 1))}
                  disabled={hospitalPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setHospitalPage(p => Math.min(hospitalPagination.totalPages, p + 1))}
                  disabled={hospitalPage === hospitalPagination.totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insurance Tab */}
      {activeTab === 'insurance' && (
        <div className="space-y-6">
          {/* Stats */}
          {insuranceStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Aseguradoras" value={insuranceStats.total} color="blue" />
              <StatCard label="Verificadas" value={insuranceStats.verified} color="green" />
              <StatCard label="Cobertura Nacional" value={insuranceStats.withNationalCoverage} color="purple" />
              <StatCard label="Planes Activos" value={insuranceStats.totalPlans} color="orange" />
            </div>
          )}

          {/* Search and View Toggle */}
          <form onSubmit={handleInsuranceSearch} className="flex gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre, RFC, CNSF..."
              value={insuranceSearch}
              onChange={(e) => setInsuranceSearch(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Buscar
            </button>
            <ViewModeToggle viewMode={insuranceViewMode} onChange={setInsuranceViewMode} />
          </form>

          {/* Content */}
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
            </div>
          ) : insurances.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-100">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p>No hay aseguradoras registradas</p>
              <p className="text-sm mt-2">Ejecuta el seed para agregar datos de prueba</p>
            </div>
          ) : insuranceViewMode === 'cards' ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insurances.map((insurance) => (
                <InsuranceCard key={insurance.id} insurance={insurance} />
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cobertura</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Red</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {insurances.map((insurance) => (
                    <tr key={insurance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {insurance.shortName && <span className="text-sky-600">{insurance.shortName} - </span>}
                            {insurance.name}
                          </p>
                          {insurance.cnsfNumber && (
                            <p className="text-sm text-gray-500">CNSF: {insurance.cnsfNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${INSURANCE_TYPE_COLORS[insurance.type as InsuranceType] || 'bg-gray-100 text-gray-800'}`}>
                          {INSURANCE_TYPE_LABELS[insurance.type as InsuranceType] || insurance.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {insurance.hasNationalCoverage && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Nacional</span>
                          )}
                          {insurance.coverageTypes?.slice(0, 2).map((type, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{type}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{insurance._count?.networkHospitals || 0} hospitales</p>
                          <p className="text-gray-500">{insurance._count?.plans || 0} planes</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {insurance.isVerified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Verificada</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleVerifyInsurance(insurance.id, !insurance.isVerified)}
                          className={`text-sm ${insurance.isVerified ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                        >
                          {insurance.isVerified ? 'Quitar verificacion' : 'Verificar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {insurancePagination && insurancePagination.totalPages > 1 && (
            <div className="px-6 py-4 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Mostrando {((insurancePage - 1) * 15) + 1} - {Math.min(insurancePage * 15, insurancePagination.total)} de {insurancePagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setInsurancePage(p => Math.max(1, p - 1))}
                  disabled={insurancePage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setInsurancePage(p => Math.min(insurancePagination.totalPages, p + 1))}
                  disabled={insurancePage === insurancePagination.totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className={`p-4 rounded-xl ${colorClasses[color] || 'bg-gray-50 text-gray-700'}`}>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm opacity-75">{label}</p>
    </div>
  );
};

export default AdminInstitutions;
