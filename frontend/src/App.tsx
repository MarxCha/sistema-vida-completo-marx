// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslation } from 'react-i18next';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Landing from './components/pages/Landing';
import Login from './components/pages/Login';
import Register from './components/pages/Register';
import Dashboard from './components/pages/Dashboard';
import Profile from './components/pages/Profile';
import Directives from './components/pages/Directives';
import Representatives from './components/pages/Representatives';
import EmergencyView from './components/pages/EmergencyView';
import EmergencyQR from './components/pages/EmergencyQR';
import AccessHistory from './components/pages/AccessHistory';
import Documents from './components/pages/Documents';
import Notifications from './components/pages/Notifications';
import NotificationSettings from './components/pages/NotificationSettings';
import Subscription from './components/pages/Subscription';
import SubscriptionPlans from './components/pages/SubscriptionPlans';
import SubscriptionSuccess from './components/pages/SubscriptionSuccess';
import NFCManager from './components/pages/NFCManager';
import WalletPass from './components/pages/WalletPass';

// Context
import { NotificationProvider } from './context/NotificationContext';

// Admin Module
import { AdminAuthProvider, AdminProtectedRoute } from './context/AdminAuthContext';
import AdminLayout from './components/admin/layouts/AdminLayout';
import {
  AdminLogin,
  AdminDashboard,
  AdminUsers,
  AdminAuditLog,
  AdminSystemHealth,
  AdminInstitutions,
  AdminSubscriptions,
} from './components/admin/pages';

// Componente de carga
const LoadingScreen = () => {
  const { t } = useTranslation('common');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vida-50 to-white">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-vida-200 border-t-vida-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-vida-600 font-medium">{t('loading')}</p>
      </div>
    </div>
  );
};

// Ruta protegida
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Ruta pública (redirige a dashboard si ya está autenticado)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const NotFoundPage = () => {
  const { t } = useTranslation('common');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-vida-600 mb-4">{t('notFound.title')}</h1>
        <p className="text-gray-600 mb-6">{t('notFound.message')}</p>
        <a href="/" className="btn-primary">
          {t('notFound.backHome')}
        </a>
      </div>
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Landing pública */}
      <Route path="/" element={<Landing />} />

      {/* Rutas de autenticación */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
      </Route>

      {/* Acceso de emergencia (público) */}
      <Route path="/emergency/:qrToken" element={<EmergencyView />} />

      {/* Rutas protegidas */}
      <Route
        element={
          <ProtectedRoute>
            <NotificationProvider>
              <MainLayout />
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/directives" element={<Directives />} />
        <Route path="/representatives" element={<Representatives />} />
        <Route path="/emergency-qr" element={<EmergencyQR />} />
        <Route path="/nfc" element={<NFCManager />} />
        <Route path="/wallet" element={<WalletPass />} />
        <Route path="/access-history" element={<AccessHistory />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings/notifications" element={<NotificationSettings />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/subscription/plans" element={<SubscriptionPlans />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
      </Route>

      {/* ==================== RUTAS DE ADMIN ==================== */}

      {/* Login de admin (publico) */}
      <Route
        path="/admin/login"
        element={
          <AdminAuthProvider>
            <AdminLogin />
          </AdminAuthProvider>
        }
      />

      {/* Panel de admin (protegido) */}
      <Route
        path="/admin"
        element={
          <AdminAuthProvider>
            <AdminProtectedRoute>
              <AdminLayout />
            </AdminProtectedRoute>
          </AdminAuthProvider>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="institutions" element={<AdminInstitutions />} />
        <Route path="audit" element={<AdminAuditLog />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="health" element={<AdminSystemHealth />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
