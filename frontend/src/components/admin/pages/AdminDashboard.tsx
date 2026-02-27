// src/components/admin/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../hooks/useLocale';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import {
  getMetricsOverview,
  getUserMetrics,
  getEmergencyMetrics,
} from '../../../services/adminApi';
import {
  DashboardMetrics,
  UserMetrics,
  EmergencyMetrics,
} from '../../../types/admin';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  subtitle?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color, subtitle, onClick }) => {
  const { t: tAdmin } = useTranslation('admin');
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-200 hover:scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          {change !== undefined && (
            <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change}{tAdmin('dashboard.vs_yesterday')}
            </p>
          )}
        </div>
        <div className={`w-14 h-14 ${colors[color]} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      {onClick && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-end text-sm text-gray-400">
          <span>{tAdmin('dashboard.view_details')}</span>
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Simple Bar Chart
interface BarChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
}

const SimpleBarChart: React.FC<BarChartProps> = ({ data, title, color = 'bg-sky-500' }) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{item.label}</span>
              <span className="font-medium text-gray-900">{item.value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`${color} rounded-full h-2 transition-all duration-500`}
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Timeline Chart (simple)
interface TimelineChartProps {
  data: { date: string; count: number }[];
  title: string;
}

const TimelineChart: React.FC<TimelineChartProps> = ({ data, title }) => {
  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="flex items-end gap-1 h-40">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center"
          >
            <div
              className="w-full bg-sky-500 rounded-t transition-all duration-500"
              style={{ height: `${(item.count / maxValue) * 100}%`, minHeight: item.count > 0 ? '4px' : '0' }}
            />
            <span className="text-xs text-gray-400 mt-2 truncate w-full text-center">
              {item.date.slice(-2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Recent Activity Item
interface ActivityItemProps {
  type: 'emergency' | 'panic' | 'user';
  title: string;
  description: string;
  time: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ type, title, description, time }) => {
  const icons = {
    emergency: (
      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    ),
    panic: (
      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    ),
    user: (
      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition">
      {icons[type]}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">{time}</span>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation('admin');
  const { formatTime } = useLocale();
  const { admin } = useAdminAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [emergencyMetrics, setEmergencyMetrics] = useState<EmergencyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar métricas de forma independiente para que un fallo no afecte a las demás
      const results = await Promise.allSettled([
        getMetricsOverview(),
        getUserMetrics('month'),
        getEmergencyMetrics('week'),
      ]);

      console.log('📊 Dashboard metrics results:', results);

      if (results[0].status === 'fulfilled') {
        setMetrics(results[0].value);
      } else {
        console.error('❌ Error loading overview:', results[0].reason);
      }

      if (results[1].status === 'fulfilled') {
        setUserMetrics(results[1].value);
      } else {
        console.error('❌ Error loading user metrics:', results[1].reason);
      }

      if (results[2].status === 'fulfilled') {
        setEmergencyMetrics(results[2].value);
      } else {
        console.error('❌ Error loading emergency metrics:', results[2].reason);
      }

      // Solo mostrar error si TODAS fallaron
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) {
        setError(t('dashboard.error'));
      }
    } catch (err: any) {
      console.error('❌ Unexpected error loading metrics:', err);
      setError(err.message || t('dashboard.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={loadMetrics} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          {t('dashboard.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          {t('dashboard.welcome', { name: admin?.name?.split(' ')[0] })}
        </h1>
        <p className="text-sky-100">
          {t(`roles.${admin?.role || 'VIEWER'}`)} - {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('dashboard.metric_users')}
          value={metrics?.users.total || 0}
          subtitle={t('dashboard.metric_users_active', { count: metrics?.users.active || 0 })}
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          color="blue"
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          title={t('dashboard.metric_directives')}
          value={metrics?.directives.active || 0}
          subtitle={t('dashboard.metric_directives_total', { count: metrics?.directives.total || 0 })}
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          color="green"
          onClick={() => navigate('/admin/users')}
        />
        <MetricCard
          title={t('dashboard.metric_qr_today')}
          value={metrics?.emergency.accessesToday || 0}
          subtitle={t('dashboard.metric_qr_total', { count: metrics?.emergency.totalAccesses || 0 })}
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m10 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
          color="purple"
          onClick={() => navigate('/admin/audit')}
        />
        <MetricCard
          title={t('dashboard.metric_alerts')}
          value={metrics?.emergency.activeAlerts || 0}
          subtitle={t('dashboard.metric_alerts_today', { count: metrics?.emergency.alertsToday || 0 })}
          icon={<svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          color="red"
          onClick={() => navigate('/admin/audit')}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User timeline */}
        {userMetrics && userMetrics.timeline.length > 0 && (
          <TimelineChart
            data={userMetrics.timeline}
            title={t('dashboard.chart_new_users')}
          />
        )}

        {/* Emergency accesses by role */}
        {emergencyMetrics && (
          <SimpleBarChart
            data={Object.entries(emergencyMetrics.accesses.byRole).map(([role, count]) => ({
              label: role,
              value: count,
            }))}
            title={t('dashboard.chart_accesses_by_role')}
            color="bg-purple-500"
          />
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User completeness */}
        {userMetrics && (
          <SimpleBarChart
            data={[
              { label: t('dashboard.completeness_with_profile'), value: userMetrics.completeness.withProfile },
              { label: t('dashboard.completeness_with_directive'), value: userMetrics.completeness.withDirective },
              { label: t('dashboard.completeness_with_reps'), value: userMetrics.completeness.withRepresentatives },
            ]}
            title={t('dashboard.chart_user_completeness')}
            color="bg-green-500"
          />
        )}

        {/* Institutions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.institutions_card')}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('dashboard.institutions_total')}</span>
              <span className="text-2xl font-bold text-gray-900">{metrics?.institutions.total || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t('dashboard.institutions_verified')}</span>
              <span className="text-2xl font-bold text-green-600">{metrics?.institutions.verified || 0}</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('dashboard.institutions_rate')}</span>
                <span className="font-medium text-gray-900">
                  {metrics?.institutions.total
                    ? Math.round((metrics.institutions.verified / metrics.institutions.total) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recent_activity')}</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {emergencyMetrics?.accesses.recent.slice(0, 5).map((access, index) => (
              <ActivityItem
                key={index}
                type="emergency"
                title={access.accessorName}
                description={t('dashboard.qr_access_desc', { institution: access.institution || t('dashboard.unknown_institution') })}
                time={formatTime(access.accessedAt)}
              />
            ))}
            {(!emergencyMetrics?.accesses.recent || emergencyMetrics.accesses.recent.length === 0) && (
              <div className="p-4 text-center text-gray-500">
                {t('dashboard.no_recent_activity')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{metrics?.users.newToday || 0}</p>
          <p className="text-sm text-blue-600">{t('dashboard.quick_users_today')}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{metrics?.users.verified || 0}</p>
          <p className="text-sm text-green-600">{t('dashboard.quick_verified')}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{emergencyMetrics?.accesses.total || 0}</p>
          <p className="text-sm text-purple-600">{t('dashboard.quick_accesses_week')}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{emergencyMetrics?.alerts.total || 0}</p>
          <p className="text-sm text-orange-600">{t('dashboard.quick_alerts_week')}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
