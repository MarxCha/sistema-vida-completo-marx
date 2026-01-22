// src/components/pages/Subscription.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription, usePaymentHistory, useInvoices } from '../../hooks/useSubscription';
import { usePremium } from '../../hooks/usePremium';
import { TrialExpiringBanner, CancellingBanner } from '../subscription/UpgradePrompt';
import type { Payment } from '../../services/api';

export default function Subscription() {
  const { subscription, loading, cancel, reactivate, openBillingPortal } = useSubscription();
  const { status, isPremium } = usePremium();
  const { payments, loading: loadingPayments } = usePaymentHistory(5);
  const { invoices, generate: generateInvoice } = useInvoices(5);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await cancel(cancelReason);
      setShowCancelModal(false);
    } catch (error) {
      alert('Error al cancelar suscripción');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivate();
    } catch (error) {
      alert('Error al reactivar suscripción');
    }
  };

  const handleGenerateInvoice = async (paymentId: string) => {
    try {
      setGeneratingInvoice(paymentId);
      await generateInvoice(paymentId);
      alert('Factura generada exitosamente');
    } catch (error) {
      alert('Error al generar factura. Verifica tus datos fiscales.');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIALING: 'bg-blue-100 text-blue-800',
      PAST_DUE: 'bg-red-100 text-red-800',
      CANCELED: 'bg-gray-100 text-gray-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Activa',
      TRIALING: 'Prueba',
      PAST_DUE: 'Pago vencido',
      CANCELED: 'Cancelada',
      PAUSED: 'Pausada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: Payment['status']) => {
    const styles: Record<string, string> = {
      SUCCEEDED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      SUCCEEDED: 'Pagado',
      PENDING: 'Pendiente',
      FAILED: 'Fallido',
      REFUNDED: 'Reembolsado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Suscripción</h1>

        {/* Banners de alerta */}
        <TrialExpiringBanner />
        <CancellingBanner />

        {/* Plan actual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {subscription?.plan?.name || status?.planName || 'Plan Básico'}
                </h2>
                {(subscription?.status || status?.status) && getStatusBadge(subscription?.status || status?.status || '')}
              </div>
              <p className="text-gray-500 mb-4">
                {isPremium || subscription?.plan?.slug === 'premium'
                  ? 'Tienes acceso a todas las funciones de Sistema VIDA'
                  : 'Actualiza para desbloquear todas las funciones'}
              </p>
              {subscription && subscription.plan.slug !== 'free' && (
                <div className="text-sm text-gray-600">
                  <p>
                    Ciclo de facturación:{' '}
                    <strong>{subscription.billingCycle === 'ANNUAL' ? 'Anual' : 'Mensual'}</strong>
                  </p>
                  <p>
                    Próxima facturación:{' '}
                    <strong>{formatDate(subscription.currentPeriodEnd)}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="text-right">
              {(isPremium || subscription?.plan?.slug === 'premium') ? (
                <div className="space-y-2">
                  <button
                    onClick={openBillingPortal}
                    className="px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                  >
                    Gestionar pago
                  </button>
                  {!(subscription?.cancelAtPeriodEnd || status?.cancelAtPeriodEnd) && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="block w-full text-sm text-gray-500 hover:text-red-600"
                    >
                      Cancelar suscripción
                    </button>
                  )}
                  {(subscription?.cancelAtPeriodEnd || status?.cancelAtPeriodEnd) && (
                    <button
                      onClick={handleReactivate}
                      className="block w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              ) : (
                <Link
                  to="/subscription/plans"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Actualizar a Premium
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Features del plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tu plan incluye</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {(() => {
              // Usar features de subscription.plan si están disponibles, sino de status
              const features = subscription?.plan?.features || status?.features;
              const limits = subscription?.plan?.limits || status?.limits;

              if (!features) return null;

              return (
                <>
                  {Object.entries(features).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      {value ? (
                        <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-300 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                        {key === 'advanceDirectives' && 'Directivas de Voluntad Anticipada'}
                        {key === 'donorPreferences' && 'Preferencias de Donación'}
                        {key === 'nom151Seal' && 'Sello NOM-151'}
                        {key === 'smsNotifications' && 'Notificaciones SMS'}
                        {key === 'exportData' && 'Exportar Datos'}
                        {key === 'prioritySupport' && 'Soporte Prioritario'}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">
                      {limits?.representativesLimit === -1 || limits?.representativesLimit === 10
                        ? 'Hasta 10 representantes'
                        : `Hasta ${limits?.representativesLimit || 2} representantes`}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-900">
                      {limits?.qrDownloadsPerMonth === 0 || limits?.qrDownloadsPerMonth === -1
                        ? 'Descargas QR ilimitadas'
                        : `${limits?.qrDownloadsPerMonth || 3} descargas QR/mes`}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Historial de pagos */}
        {(isPremium || subscription?.plan?.slug === 'premium') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Historial de pagos</h3>
              <Link to="/billing/fiscal-data" className="text-sm text-purple-600 hover:underline">
                Datos fiscales
              </Link>
            </div>
            {loadingPayments ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : !payments || payments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay pagos registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Descripción</th>
                      <th className="pb-2">Monto</th>
                      <th className="pb-2">Estado</th>
                      <th className="pb-2">Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-600">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="py-3 text-sm text-gray-900">
                          {payment.description || 'Suscripción'}
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="py-3">{getPaymentStatusBadge(payment.status)}</td>
                        <td className="py-3">
                          {payment.status === 'SUCCEEDED' && (
                            <button
                              onClick={() => handleGenerateInvoice(payment.id)}
                              disabled={generatingInvoice === payment.id}
                              className="text-sm text-purple-600 hover:underline disabled:opacity-50"
                            >
                              {generatingInvoice === payment.id ? 'Generando...' : 'Facturar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Facturas */}
        {(isPremium || subscription?.plan?.slug === 'premium') && invoices.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Facturas emitidas</h3>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.serie}-{invoice.folio}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.uuid ? `UUID: ${invoice.uuid.slice(0, 8)}...` : 'Pendiente'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(invoice.total)}</p>
                    <div className="flex gap-2 mt-1">
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline"
                        >
                          PDF
                        </a>
                      )}
                      {invoice.xmlUrl && (
                        <a
                          href={invoice.xmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:underline"
                        >
                          XML
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de cancelación */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Cancelar suscripción</h3>
              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas cancelar tu suscripción Premium? Mantendrás el acceso
                hasta el final de tu período de facturación actual.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ¿Por qué cancelas? (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                  rows={3}
                  placeholder="Tu retroalimentación nos ayuda a mejorar..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Mantener suscripción
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Confirmar cancelación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
