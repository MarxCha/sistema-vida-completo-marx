// src/components/pages/Directives.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { directivesApi } from '../../services/api';
import type { AdvanceDirective, DirectiveDraft } from '../../types';

type DirectiveStatus = 'DRAFT' | 'PENDING_VALIDATION' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

const statusConfig: Record<DirectiveStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Borrador', color: 'text-gray-700', bg: 'bg-gray-100' },
  PENDING_VALIDATION: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  ACTIVE: { label: 'Activa', color: 'text-green-700', bg: 'bg-green-100' },
  REVOKED: { label: 'Revocada', color: 'text-red-700', bg: 'bg-red-100' },
  EXPIRED: { label: 'Expirada', color: 'text-gray-500', bg: 'bg-gray-50' },
};

export default function Directives() {
  const [directives, setDirectives] = useState<AdvanceDirective[]>([]);
  const [activeDirective, setActiveDirective] = useState<AdvanceDirective | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  
  const [draftForm, setDraftForm] = useState<DirectiveDraft>({
    acceptsCPR: null,
    acceptsIntubation: null,
    acceptsDialysis: null,
    acceptsTransfusion: null,
    acceptsArtificialNutrition: null,
    palliativeCareOnly: false,
    additionalNotes: '',
    originState: '',
  });

  useEffect(() => {
    loadDirectives();
  }, []);

  const loadDirectives = async () => {
    try {
      setLoading(true);
      const [listRes, activeRes] = await Promise.all([
        directivesApi.list(),
        directivesApi.getActive(),
      ]);
      
      if (listRes.success && listRes.data) {
        setDirectives(listRes.data.directives);
      }
      if (activeRes.success && activeRes.data?.directive) {
        setActiveDirective(activeRes.data.directive);
      }
    } catch (err) {
      setError('Error cargando directivas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    
    try {
      const res = await directivesApi.createDraft(draftForm);
      if (res.success) {
        setShowCreateModal(false);
        loadDirectives();
        setDraftForm({
          acceptsCPR: null,
          acceptsIntubation: null,
          acceptsDialysis: null,
          acceptsTransfusion: null,
          acceptsArtificialNutrition: null,
          palliativeCareOnly: false,
          additionalNotes: '',
          originState: '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error creando borrador');
    } finally {
      setCreating(false);
    }
  };

  const handleValidate = async (id: string) => {
    try {
      await directivesApi.validate(id, 'EMAIL');
      loadDirectives();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error validando directiva');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('¿Está seguro de revocar esta directiva? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await directivesApi.revoke(id);
      loadDirectives();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error revocando directiva');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este borrador?')) {
      return;
    }
    
    try {
      await directivesApi.delete(id);
      loadDirectives();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Error eliminando borrador');
    }
  };

  const DecisionToggle = ({
    label,
    value,
    onChange
  }: {
    label: string;
    value: boolean | null | undefined;
    onChange: (val: boolean | null) => void
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-gray-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            value === true 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            value === false 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          No
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            value === null 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Sin preferencia
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voluntades Anticipadas</h1>
            <p className="mt-2 text-gray-600">
              Gestiona tus directivas de voluntad anticipada
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear nueva
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        {/* Active Directive Banner */}
        {activeDirective && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800">Directiva Activa</h3>
                <p className="text-green-700 mt-1">
                  Tu voluntad anticipada está vigente y será respetada en caso de emergencia.
                </p>
                <p className="text-sm text-green-600 mt-2">
                  Validada el {new Date(activeDirective.validatedAt!).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Directives List */}
        <div className="space-y-4">
          {directives.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sin directivas</h3>
              <p className="text-gray-500 mb-6">
                Aún no has creado ninguna voluntad anticipada
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear mi primera directiva
              </button>
            </div>
          ) : (
            directives.map((directive) => {
              const status = statusConfig[directive.status as DirectiveStatus];
              return (
                <div key={directive.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} ${status.bg}`}>
                          {status.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {directive.type === 'DIGITAL_DRAFT' ? 'Borrador digital' : 
                           directive.type === 'NOTARIZED_DOCUMENT' ? 'Documento notariado' : 
                           'Con testigos digitales'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">
                        Creado el {new Date(directive.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>

                      {/* Medical Decisions Summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={directive.acceptsCPR ? 'text-green-600' : directive.acceptsCPR === false ? 'text-red-600' : 'text-gray-400'}>
                            {directive.acceptsCPR ? '✓' : directive.acceptsCPR === false ? '✗' : '—'}
                          </span>
                          <span className="text-gray-600">RCP</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={directive.acceptsIntubation ? 'text-green-600' : directive.acceptsIntubation === false ? 'text-red-600' : 'text-gray-400'}>
                            {directive.acceptsIntubation ? '✓' : directive.acceptsIntubation === false ? '✗' : '—'}
                          </span>
                          <span className="text-gray-600">Intubación</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={directive.palliativeCareOnly ? 'text-blue-600' : 'text-gray-400'}>
                            {directive.palliativeCareOnly ? '✓' : '—'}
                          </span>
                          <span className="text-gray-600">Solo paliativo</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      {directive.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleValidate(directive.id)}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                          >
                            Validar
                          </button>
                          <button
                            onClick={() => handleDelete(directive.id)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                      {directive.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(directive.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                        >
                          Revocar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            ¿Qué es una voluntad anticipada?
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            Es un documento legal donde expresas tus decisiones sobre tratamientos médicos 
            en caso de que no puedas comunicarte. Incluye preferencias sobre reanimación, 
            ventilación mecánica, diálisis, transfusiones y cuidados paliativos.
          </p>
          <div className="mt-4 flex gap-4">
            <Link to="/info/directivas" className="text-sm text-blue-600 hover:underline">
              Más información →
            </Link>
            <Link to="/info/marco-legal" className="text-sm text-blue-600 hover:underline">
              Marco legal en México →
            </Link>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Nueva Voluntad Anticipada
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateDraft} className="p-6">
              <div className="space-y-2 mb-6">
                <h3 className="font-medium text-gray-900">Decisiones médicas</h3>
                <p className="text-sm text-gray-500">
                  Indica tus preferencias para cada tratamiento. Puedes dejar sin preferencia los que desees.
                </p>
              </div>

              <div className="space-y-1">
                <DecisionToggle
                  label="Reanimación cardiopulmonar (RCP)"
                  value={draftForm.acceptsCPR}
                  onChange={(val) => setDraftForm({ ...draftForm, acceptsCPR: val })}
                />
                <DecisionToggle
                  label="Intubación / ventilación mecánica"
                  value={draftForm.acceptsIntubation}
                  onChange={(val) => setDraftForm({ ...draftForm, acceptsIntubation: val })}
                />
                <DecisionToggle
                  label="Diálisis"
                  value={draftForm.acceptsDialysis}
                  onChange={(val) => setDraftForm({ ...draftForm, acceptsDialysis: val })}
                />
                <DecisionToggle
                  label="Transfusiones sanguíneas"
                  value={draftForm.acceptsTransfusion}
                  onChange={(val) => setDraftForm({ ...draftForm, acceptsTransfusion: val })}
                />
                <DecisionToggle
                  label="Nutrición artificial"
                  value={draftForm.acceptsArtificialNutrition}
                  onChange={(val) => setDraftForm({ ...draftForm, acceptsArtificialNutrition: val })}
                />
              </div>

              <div className="mt-6 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="palliativeCareOnly"
                  checked={draftForm.palliativeCareOnly}
                  onChange={(e) => setDraftForm({ ...draftForm, palliativeCareOnly: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="palliativeCareOnly" className="text-gray-700">
                  Solo deseo recibir cuidados paliativos
                </label>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de origen (para marco legal aplicable)
                </label>
                <select
                  value={draftForm.originState}
                  onChange={(e) => setDraftForm({ ...draftForm, originState: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona tu estado</option>
                  <option value="CDMX">Ciudad de México</option>
                  <option value="JAL">Jalisco</option>
                  <option value="NL">Nuevo León</option>
                  <option value="AGS">Aguascalientes</option>
                  <option value="COAH">Coahuila</option>
                  <option value="COL">Colima</option>
                  <option value="GTO">Guanajuato</option>
                  <option value="GRO">Guerrero</option>
                  <option value="HGO">Hidalgo</option>
                  <option value="MEX">Estado de México</option>
                  <option value="MICH">Michoacán</option>
                  <option value="NAY">Nayarit</option>
                  <option value="OAX">Oaxaca</option>
                  <option value="SLP">San Luis Potosí</option>
                  <option value="YUC">Yucatán</option>
                </select>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={draftForm.additionalNotes}
                  onChange={(e) => setDraftForm({ ...draftForm, additionalNotes: e.target.value })}
                  rows={4}
                  maxLength={5000}
                  placeholder="Puedes agregar instrucciones específicas o aclaraciones..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="mt-8 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Guardando...' : 'Guardar borrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
