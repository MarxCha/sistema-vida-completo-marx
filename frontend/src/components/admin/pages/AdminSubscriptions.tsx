// src/components/admin/pages/AdminSubscriptions.tsx
import { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  CreditCard,
  Calendar,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import * as adminApi from '../../../services/adminApi';

interface SubscriptionStats {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  conversionRate: number;
  avgRevenuePerUser: number;
  revenueGrowth: number;
}

interface SubscriptionRecord {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  plan: {
    name: string;
    slug: string;
  };
  billingCycle: 'MONTHLY' | 'ANNUAL';
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE' | 'PAUSED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  user: {
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  paymentMethod: 'CARD' | 'OXXO';
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'REFUNDED';
  description: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  TRIALING: 'bg-blue-100 text-blue-800',
  PAST_DUE: 'bg-yellow-100 text-yellow-800',
  CANCELED: 'bg-gray-100 text-gray-800',
  UNPAID: 'bg-red-100 text-red-800',
  INCOMPLETE: 'bg-orange-100 text-orange-800',
  PAUSED: 'bg-purple-100 text-purple-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SUCCEEDED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activa',
  TRIALING: 'En prueba',
  PAST_DUE: 'Pago pendiente',
  CANCELED: 'Cancelada',
  UNPAID: 'Sin pagar',
  INCOMPLETE: 'Incompleta',
  PAUSED: 'Pausada',
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  SUCCEEDED: 'Exitoso',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
};

export default function AdminSubscriptions() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments'>('overview');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const response = await adminApi.getSubscriptionStats();
        console.log('Stats response:', response);
        if (response.success && response.data) {
          setStats(response.data);
        }
      } else if (activeTab === 'subscriptions') {
        const response = await adminApi.getSubscriptions({
          page: currentPage,
          limit: 15,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });
        console.log('Subscriptions response:', response);
        if (response.success && response.data) {
          setSubscriptions(response.data.subscriptions || []);
          setTotalPages(response.data.totalPages || 1);
        }
      } else if (activeTab === 'payments') {
        const response = await adminApi.getPayments({
          page: currentPage,
          limit: 15,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        });
        console.log('Payments response:', response);
        if (response.success && response.data) {
          setPayments(response.data.payments || []);
          setTotalPages(response.data.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Use mock data for demo
      if (activeTab === 'overview') {
        setStats({
          totalRevenue: 0,
          monthlyRevenue: 0,
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          trialSubscriptions: 0,
          cancelledSubscriptions: 0,
          conversionRate: 0,
          avgRevenuePerUser: 0,
          revenueGrowth: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">+{stats?.revenueGrowth || 0}%</span>
            <span className="text-gray-500 ml-1">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Promedio por usuario:</span>
            <span className="text-gray-900 font-medium ml-1">
              {formatCurrency(stats?.avgRevenuePerUser || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Suscripciones Activas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.activeSubscriptions || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <UserCheck className="w-4 h-4 text-blue-500 mr-1" />
            <span className="text-blue-600 font-medium">{stats?.trialSubscriptions || 0}</span>
            <span className="text-gray-500 ml-1">en período de prueba</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.conversionRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">De prueba a pago</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose de Suscripciones</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Activas</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.activeSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700">En prueba</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.trialSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">Canceladas</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.cancelledSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-vida-50 rounded-lg border border-vida-200">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-vida-600" />
                <span className="text-vida-700 font-medium">Total</span>
              </div>
              <span className="font-bold text-vida-700">{stats?.totalSubscriptions || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">Ver todas las suscripciones</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Ver historial de pagos</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">Abrir Stripe Dashboard</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los datos de ingresos se actualizan en tiempo real desde Stripe.
            Para ver reportes detallados y realizar reembolsos, accede al Dashboard de Stripe.
          </p>
        </div>
      </div>
    </div>
  );

  const renderSubscriptions = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-vida-500 focus:border-vida-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-vida-500 focus:border-vida-500"
        >
          <option value="all">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="TRIALING">En prueba</option>
          <option value="PAST_DUE">Pago pendiente</option>
          <option value="CANCELED">Canceladas</option>
        </select>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ciclo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Crown className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay suscripciones premium aún</p>
                    <p className="text-sm mt-1">Las suscripciones aparecerán aquí cuando los usuarios actualicen a Premium</p>
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{sub.user.name}</p>
                        <p className="text-sm text-gray-500">{sub.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1">
                        <Crown className="w-4 h-4 text-purple-500" />
                        {sub.plan.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {sub.billingCycle === 'MONTHLY' ? 'Mensual' : 'Anual'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[sub.status]}`}>
                        {statusLabels[sub.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(sub.currentPeriodStart)} - {formatDate(sub.currentPeriodEnd)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(sub.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-vida-500 focus:border-vida-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-vida-500 focus:border-vida-500"
        >
          <option value="all">Todos los estados</option>
          <option value="SUCCEEDED">Exitosos</option>
          <option value="PENDING">Pendientes</option>
          <option value="FAILED">Fallidos</option>
          <option value="REFUNDED">Reembolsados</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 bg-vida-600 text-white rounded-lg hover:bg-vida-700">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay pagos registrados aún</p>
                    <p className="text-sm mt-1">Los pagos aparecerán aquí cuando los usuarios realicen transacciones</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{payment.user.name}</p>
                        <p className="text-sm text-gray-500">{payment.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <CreditCard className="w-4 h-4" />
                        {payment.paymentMethod === 'CARD' ? 'Tarjeta' : 'OXXO'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos y Suscripciones</h1>
          <p className="text-gray-500 mt-1">Gestiona los pagos y suscripciones de usuarios</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-8">
          <button
            onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-vida-600 text-vida-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => { setActiveTab('subscriptions'); setCurrentPage(1); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-vida-600 text-vida-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Suscripciones
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setCurrentPage(1); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-vida-600 text-vida-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pagos
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vida-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'subscriptions' && renderSubscriptions()}
          {activeTab === 'payments' && renderPayments()}
        </>
      )}
    </div>
  );
}
