// Service Worker para Sistema VIDA
// Maneja notificaciones push incluso cuando la app está cerrada

const CACHE_NAME = 'vida-cache-v2';
const NOTIFICATION_BADGE = '/favicon.svg';

// Minimal translations for the service worker context (no React available here)
const translations = {
  es: {
    newNotification: 'Nueva notificacion',
    viewDetails: 'Ver detalles',
    call: 'Llamar',
    viewAccess: 'Ver acceso',
    dismiss: 'Cerrar',
    view: 'Ver',
    appName: 'Sistema VIDA'
  },
  en: {
    newNotification: 'New notification',
    viewDetails: 'View details',
    call: 'Call',
    viewAccess: 'View access',
    dismiss: 'Dismiss',
    view: 'View',
    appName: 'VIDA System'
  }
};

function getLang(payload) {
  // Use language from notification payload if available, default to 'es'
  const lang = payload && payload.lang;
  return (lang && translations[lang]) ? lang : 'es';
}

function sw_t(lang, key) {
  return translations[lang][key] || translations['es'][key] || key;
}

// Archivos a cachear para offline
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/notification-sound.mp3'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache abierto');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Error cacheando archivos:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Manejo de notificaciones push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido:', event);

  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { body: event.data.text() };
    }
  }

  const lang = getLang(payload);

  let data = {
    title: sw_t(lang, 'appName'),
    body: sw_t(lang, 'newNotification'),
    icon: NOTIFICATION_BADGE,
    badge: NOTIFICATION_BADGE,
    tag: 'vida-notification',
    requireInteraction: false,
    data: {}
  };

  data = { ...data, ...payload };

  // Configurar opciones según tipo de notificación
  const options = {
    body: data.body,
    icon: data.icon || NOTIFICATION_BADGE,
    badge: NOTIFICATION_BADGE,
    tag: data.tag || 'vida-notification',
    requireInteraction: data.type === 'PANIC_ALERT' || data.type === 'QR_ACCESS',
    vibrate: data.type === 'PANIC_ALERT' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    data: data.data || {},
    actions: getActionsForType(data.type, lang)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Obtener acciones según tipo de notificación
function getActionsForType(type, lang) {
  const l = lang || 'es';
  switch (type) {
    case 'PANIC_ALERT':
      return [
        { action: 'view', title: sw_t(l, 'viewDetails'), icon: '/icons/view.png' },
        { action: 'call', title: sw_t(l, 'call'), icon: '/icons/call.png' }
      ];
    case 'QR_ACCESS':
      return [
        { action: 'view', title: sw_t(l, 'viewAccess'), icon: '/icons/view.png' },
        { action: 'dismiss', title: sw_t(l, 'dismiss'), icon: '/icons/close.png' }
      ];
    default:
      return [
        { action: 'view', title: sw_t(l, 'view'), icon: '/icons/view.png' }
      ];
  }
}

// Manejo de click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.action);

  event.notification.close();

  const notificationData = event.notification.data;
  let urlToOpen = '/dashboard';

  // Determinar URL según tipo y acción
  if (notificationData.type === 'PANIC_ALERT') {
    urlToOpen = '/dashboard';
  } else if (notificationData.type === 'QR_ACCESS') {
    urlToOpen = '/access-history';
  } else if (notificationData.url) {
    urlToOpen = notificationData.url;
  }

  // Manejar acciones específicas
  if (event.action === 'call' && notificationData.phone) {
    urlToOpen = `tel:${notificationData.phone}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: notificationData,
              action: event.action
            });
            return;
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Manejo de cierre de notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notificación cerrada:', event.notification.tag);

  // Enviar analítica si es necesario
  const notificationData = event.notification.data;

  // Notificar a la app si está abierta
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'NOTIFICATION_CLOSED',
        data: notificationData
      });
    });
  });
});

// Sincronización en background (para cuando vuelve la conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncPendingNotifications());
  }
});

async function syncPendingNotifications() {
  // Aquí se pueden sincronizar notificaciones pendientes
  // cuando el dispositivo vuelve a estar online
  console.log('[SW] Sincronizando notificaciones pendientes...');
}

// Mensaje desde la aplicación principal
self.addEventListener('message', (event) => {
  console.log('[SW] Mensaje recibido:', event.data);

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch handler para cache offline
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return;

  // No cachear requests de API
  if (event.request.url.includes('/api/')) return;

  // Estrategia Network First para navegación (HTML)
  // Esto asegura que siempre obtengamos la versión más reciente de la app
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then((response) => {
              if (response) return response;
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Estrategia Cache First para assets estáticos
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
