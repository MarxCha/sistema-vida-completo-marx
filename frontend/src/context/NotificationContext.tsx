// src/context/NotificationContext.tsx
import { createContext, useContext, useEffect, ReactNode } from 'react';
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

    // Alerta de pánico
    const handlePanicAlert = (data: any) => {
      pushNotifications.addNotification({
        type: 'PANIC_ALERT',
        title: 'Alerta de Panico Activada',
        body: `Se ha activado una alerta de panico. ${data.nearbyHospitals?.[0]?.name ? `Hospital mas cercano: ${data.nearbyHospitals[0].name}` : ''}`,
        data
      });

      // Mostrar notificación del sistema si hay permiso
      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification('Alerta de Panico - Sistema VIDA', {
          body: 'Se ha activado una alerta de panico. Toca para ver detalles.',
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
        title: 'Alerta Cancelada',
        body: 'La alerta de panico ha sido cancelada.',
        data
      });
    };

    // Acceso QR
    const handleQRAccess = (data: any) => {
      pushNotifications.addNotification({
        type: 'QR_ACCESS',
        title: 'Acceso a tus Datos Medicos',
        body: `${data.accessorName} (${data.accessorRole}) ha accedido a tu informacion medica.`,
        data
      });

      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification('Acceso a Datos - Sistema VIDA', {
          body: `${data.accessorName} ha accedido a tu informacion medica.`,
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
        title: 'Tu QR fue Escaneado',
        body: `${data.accessorName} escaneo tu codigo QR desde ${data.location || 'ubicacion desconocida'}.`,
        data
      });

      if (pushNotifications.permission === 'granted') {
        pushNotifications.showNotification('QR Escaneado - Sistema VIDA', {
          body: `${data.accessorName} escaneo tu codigo QR.`,
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
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
}

export default NotificationContext;
