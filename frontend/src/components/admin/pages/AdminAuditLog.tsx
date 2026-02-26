// src/components/admin/pages/AdminAuditLog.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../hooks/useLocale';
import {
  listAuditLogs,
  listEmergencyAccesses,
  listPanicAlerts,
  exportAuditLogs,
  getAuditStats,
} from '../../../services/adminApi';
import { AuditLog, EmergencyAccess, PanicAlert, Pagination, AuditStats } from '../../../types/admin';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { ADMIN_PERMISSIONS } from '../../../types/admin';

type TabType = 'user' | 'emergency' | 'panic';

const AdminAuditLog: React.FC = () => {
  const { t } = useTranslation('admin');
  const { formatDateTime } = useLocale();
  const { hasPermission } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [emergencyAccesses, setEmergencyAccesses] = useState<EmergencyAccess[]>([]);
  const [panicAlerts, setPanicAlerts] = useState<PanicAlert[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  const canExport = hasPermission(ADMIN_PERMISSIONS.AUDIT_EXPORT);

  useEffect(() => {
    loadData();
    loadStats();
  }, [activeTab, currentPage]);

  const loadStats = async () => {
    try {
      const data = await getAuditStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      switch (activeTab) {
        case 'user':
          const logsResult = await listAuditLogs({
            page: currentPage,
            limit: 30,
            action: action || undefined,
            resource: resource || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });
          setAuditLogs(logsResult.logs);
          setPagination(logsResult.pagination);
          break;

        case 'emergency':
          const emergencyResult = await listEmergencyAccesses({
            page: currentPage,
            limit: 30,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });
          setEmergencyAccesses(emergencyResult.accesses);
          setPagination(emergencyResult.pagination);
          break;

        case 'panic':
          const panicResult = await listPanicAlerts({
            page: currentPage,
            limit: 30,
            status: status || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });
          setPanicAlerts(panicResult.alerts);
          setPagination(panicResult.pagination);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportType = activeTab === 'panic' ? 'emergency' : activeTab;
      const csv = await exportAuditLogs(exportType as 'user' | 'admin' | 'emergency', 'csv', startDate, endDate);
      const blob = new Blob([csv as string], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_${activeTab}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert(t('audit.export_error'));
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-700';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-700';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-700';
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-red-100 text-red-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      case 'EXPIRED': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('audit.title')}</h1>
          <p className="text-gray-500">{t('audit.subtitle')}</p>
        </div>
        {canExport && (
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('audit.btn_export')}
          </button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats.totals.userLogs.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t('audit.stat_user_logs')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats.totals.adminLogs.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t('audit.stat_admin_logs')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-sky-600">{stats.recent.last24h.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t('audit.stat_last_24h')}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-2xl font-bold text-purple-600">{stats.recent.last7d.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{t('audit.stat_last_7d')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b flex">
          <button
            onClick={() => { setActiveTab('user'); setCurrentPage(1); }}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'user'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('audit.tab_user')}
          </button>
          <button
            onClick={() => { setActiveTab('emergency'); setCurrentPage(1); }}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'emergency'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('audit.tab_emergency')}
          </button>
          <button
            onClick={() => { setActiveTab('panic'); setCurrentPage(1); }}
            className={`px-6 py-4 font-medium transition ${
              activeTab === 'panic'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('audit.tab_panic')}
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
            placeholder={t('audit.filter_from')}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-lg"
            placeholder={t('audit.filter_to')}
          />

          {activeTab === 'user' && (
            <>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={t('audit.filter_action')}
                className="px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                placeholder={t('audit.filter_resource')}
                className="px-3 py-2 border rounded-lg"
              />
            </>
          )}

          {activeTab === 'panic' && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">{t('audit.filter_all_status')}</option>
              <option value="ACTIVE">{t('audit.filter_active')}</option>
              <option value="RESOLVED">{t('audit.filter_resolved')}</option>
              <option value="CANCELLED">{t('audit.filter_cancelled')}</option>
              <option value="EXPIRED">{t('audit.filter_expired')}</option>
            </select>
          )}

          <button
            onClick={() => { setCurrentPage(1); loadData(); }}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
          >
            {t('audit.btn_filter')}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* User Audit Logs */}
            {activeTab === 'user' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_user')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_action')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_resource')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_ip')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{log.user?.name || log.actorName || '-'}</p>
                        <p className="text-sm text-gray-500">{log.user?.email || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.resource}
                        {log.resourceId && <span className="text-gray-400 ml-1">#{log.resourceId.slice(0, 8)}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Emergency Accesses */}
            {activeTab === 'emergency' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_patient')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_professional')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_institution')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_data_accessed')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {emergencyAccesses.map((access) => (
                    <tr key={access.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(access.accessedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{access.patient?.name || '-'}</p>
                        <p className="text-sm text-gray-500 font-mono">{access.patient?.curp || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{access.accessorName}</p>
                        <p className="text-sm text-gray-500">{access.accessorRole}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{access.institution?.name || access.institutionName || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {access.dataAccessed.slice(0, 3).map((data, i) => (
                            <span key={i} className="inline-flex px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                              {data}
                            </span>
                          ))}
                          {access.dataAccessed.length > 3 && (
                            <span className="text-xs text-gray-400">+{access.dataAccessed.length - 3}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Panic Alerts */}
            {activeTab === 'panic' && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_user')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_location')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('audit.col_resolution')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {panicAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(alert.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{alert.user?.name || '-'}</p>
                        <p className="text-sm text-gray-500">{alert.user?.phone || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {alert.locationName || `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {alert.resolvedAt ? formatDateTime(alert.resolvedAt) :
                         alert.cancelledAt ? formatDateTime(alert.cancelledAt) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Empty state */}
            {((activeTab === 'user' && auditLogs.length === 0) ||
              (activeTab === 'emergency' && emergencyAccesses.length === 0) ||
              (activeTab === 'panic' && panicAlerts.length === 0)) && (
              <div className="p-8 text-center text-gray-500">
                {t('audit.no_records')}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('audit.pagination_page', { current: currentPage, total: pagination.totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                {t('audit.btn_previous')}
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
              >
                {t('audit.btn_next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
