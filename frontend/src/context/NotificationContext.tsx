// src/context/NotificationContext.tsx
import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import i18next from 'i18next';
import { usePushNotifications, VidaNotification } from '../hooks/usePushNotifications';
import { useWebSocket } from '../hooks/useWebSocket';

interface NotificationContextType {
  // Estado
  permission: NotificationPermission;
  supported: boolean;
  serviceWorkerReady: boolean;
  notifications: VidaNotification[];
  unreadCount: number;

  // Acciones
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions & { type?: string; data?: Record<string, any> }) => void;
  addNotification: (notification: Omit<VidaNotification, 'id' | 'read' | 'createdAt'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const pushNotifications = usePushNotifications();
  const { socket, isConnected } = useWebSocket();

  // Escuchar eventos de WebSocket para crear notificaciones
  useEffect(() => {
    if (!socket || !isConnected) return;

    const t = i18next.t.bind(i18next);

    // Alerta de pánico
    const handlePanicAlert = (data: any) => {
      pushNotifications.addNotification({
        type: 'PANIC_ALERT',
        title: t('notifications:ws.panicAlert.title'),
        body: `${t('notifications:ws.panicAlert.body')} ${data.nearbyHospitals?.[0]?.name ? `${t('notifications:ws.panicAlert.nearestHospital', { name: data.nearbyHospitals[0].name })}` : ''}`,
        data
      });

      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification(t('notifications:ws.panicAlert.systemTitle'), {
          body: t('notifications:ws.panicAlert.systemBody'),
          type: 'PANIC_ALERT',
          tag: `panic-${data.alertId}`,
          requireInteraction: true,
          data
        });
      }
    };

    // Pánico cancelado
    const handlePanicCancelled = (data: any) => {
      pushNotifications.addNotification({
        type: 'PANIC_ALERT',
        title: t('notifications:ws.panicCancelled.title'),
        body: t('notifications:ws.panicCancelled.body'),
        data
      });
    };

    // Acceso QR
    const handleQRAccess = (data: any) => {
      pushNotifications.addNotification({
        type: 'QR_ACCESS',
        title: t('notifications:ws.qrAccess.title'),
        body: t('notifications:ws.qrAccess.body', { name: data.accessorName, role: data.accessorRole }),
        data
      });

      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification(t('notifications:ws.qrAccess.systemTitle'), {
          body: t('notifications:ws.qrAccess.systemBody', { name: data.accessorName }),
          type: 'QR_ACCESS',
          tag: `qr-access-${Date.now()}`,
          data
        });
      }
    };

    // Notificación de acceso QR (para el usuario)
    const handleQRNotification = (data: any) => {
      pushNotifications.addNotification({
        type: 'QR_ACCESS',
        title: t('notifications:ws.qrScanned.title'),
        body: t('notifications:ws.qrScanned.body', { name: data.accessorName, location: data.location || t('notifications:ws.qrScanned.unknownLocation') }),
        data
      });

      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification(t('notifications:ws.qrScanned.systemTitle'), {
          body: t('notifications:ws.qrScanned.systemBody', { name: data.accessorName }),
          type: 'QR_ACCESS',
          tag: `qr-scan-${Date.now()}`,
          data
        });
      }
    };

    socket.on('panic-alert', handlePanicAlert);
    socket.on('panic-cancelled', handlePanicCancelled);
    socket.on('qr-access-alert', handleQRAccess);
    socket.on('qr-access-notification', handleQRNotification);

    return () => {
      socket.off('panic-alert', handlePanicAlert);
      socket.off('panic-cancelled', handlePanicCancelled);
      socket.off('qr-access-alert', handleQRAccess);
      socket.off('qr-access-notification', handleQRNotification);
    };
  }, [socket, isConnected, pushNotifications]);

  return (
    <NotificationContext.Provider value={pushNotifications}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
