// src/components/admin/pages/AdminSubscriptions.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../hooks/useLocale';
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

// Status labels are now handled via i18n (subscriptions.status_*)

export default function AdminSubscriptions() {
  const { t } = useTranslation('admin');
  const { formatCurrency: fmtCurrency, formatDate: fmtDate } = useLocale();
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

  const formatCurrency = (amount: number) => fmtCurrency(amount);
  const formatDate = (dateString: string) => fmtDate(dateString);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('subscriptions.stat_total_revenue')}</p>
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
            <span className="text-gray-500 ml-1">{t('subscriptions.vs_previous_month')}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('subscriptions.stat_monthly_revenue')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.monthlyRevenue || 0)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{t('subscriptions.avg_per_user')}</span>
            <span className="text-gray-900 font-medium ml-1">
              {formatCurrency(stats?.avgRevenuePerUser || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('subscriptions.stat_active_subs')}</p>
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
            <span className="text-gray-500 ml-1">{t('subscriptions.in_trial')}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t('subscriptions.stat_conversion')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.conversionRate || 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{t('subscriptions.trial_to_paid')}</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscriptions.breakdown_title')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">{t('subscriptions.breakdown_active')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.activeSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-gray-700">{t('subscriptions.breakdown_trial')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.trialSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">{t('subscriptions.breakdown_cancelled')}</span>
              </div>
              <span className="font-semibold text-gray-900">{stats?.cancelledSubscriptions || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-vida-50 rounded-lg border border-vida-200">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-vida-600" />
                <span className="text-vida-700 font-medium">{t('subscriptions.breakdown_total')}</span>
              </div>
              <span className="font-bold text-vida-700">{stats?.totalSubscriptions || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscriptions.quick_actions')}</h3>
          <div className="space-y-3">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">{t('subscriptions.action_view_subs')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">{t('subscriptions.action_view_payments')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">{t('subscriptions.action_stripe')}</span>
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
            <strong>Nota:</strong> {t('subscriptions.note_stripe')}
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
            placeholder={t('subscriptions.search_placeholder')}
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
          <option value="all">{t('subscriptions.filter_all')}</option>
          <option value="ACTIVE">{t('subscriptions.filter_active')}</option>
          <option value="TRIALING">{t('subscriptions.filter_trial')}</option>
          <option value="PAST_DUE">{t('subscriptions.filter_past_due')}</option>
          <option value="CANCELED">{t('subscriptions.filter_cancelled')}</option>
        </select>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t('subscriptions.btn_refresh')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_user')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_plan')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_cycle')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_period')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_created')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Crown className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>{t('subscriptions.empty_subs')}</p>
                    <p className="text-sm mt-1">{t('subscriptions.empty_subs_hint')}</p>
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
                      {sub.billingCycle === 'MONTHLY' ? t('subscriptions.cycle_monthly') : t('subscriptions.cycle_annual')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[sub.status]}`}>
                        {t(`subscriptions.status_${sub.status.toLowerCase()}`, { defaultValue: sub.status })}
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
              {t('subscriptions.pagination_page', { current: currentPage, total: totalPages })}
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
            placeholder={t('subscriptions.search_placeholder')}
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
          <option value="all">{t('subscriptions.filter_all')}</option>
          <option value="SUCCEEDED">{t('subscriptions.filter_succeeded')}</option>
          <option value="PENDING">{t('subscriptions.filter_pending')}</option>
          <option value="FAILED">{t('subscriptions.filter_failed')}</option>
          <option value="REFUNDED">{t('subscriptions.filter_refunded')}</option>
        </select>
        <button className="flex items-center gap-2 px-4 py-2 bg-vida-600 text-white rounded-lg hover:bg-vida-700">
          <Download className="w-4 h-4" />
          {t('subscriptions.btn_export')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_user')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_amount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_method')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_description')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subscriptions.col_date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p>{t('subscriptions.empty_payments')}</p>
                    <p className="text-sm mt-1">{t('subscriptions.empty_payments_hint')}</p>
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
                        {payment.paymentMethod === 'CARD' ? t('subscriptions.method_card') : t('subscriptions.method_oxxo')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[payment.status]}`}>
                        {t(`subscriptions.status_${payment.status.toLowerCase()}`, { defaultValue: payment.status })}
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
              {t('subscriptions.pagination_page', { current: currentPage, total: totalPages })}
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
          <h1 className="text-2xl font-bold text-gray-900">{t('subscriptions.title')}</h1>
          <p className="text-gray-500 mt-1">{t('subscriptions.subtitle')}</p>
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
            {t('subscriptions.tab_overview')}
          </button>
          <button
            onClick={() => { setActiveTab('subscriptions'); setCurrentPage(1); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'subscriptions'
                ? 'border-vida-600 text-vida-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('subscriptions.tab_subscriptions')}
          </button>
          <button
            onClick={() => { setActiveTab('payments'); setCurrentPage(1); }}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-vida-600 text-vida-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('subscriptions.tab_payments')}
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
