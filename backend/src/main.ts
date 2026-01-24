// src/main.ts

// IMPORTANTE: Validar variables de entorno ANTES de cargar cualquier módulo
import { validateEnvironment } from './common/utils/env-validation';
validateEnvironment();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

// Middleware de seguridad
import { csrfProtection, securityHeaders } from './common/middleware/csrf.middleware';
import { requestLogger, logger } from './common/services/logger.service';
import { securityMetrics } from './common/services/security-metrics.service';
import { auditRetentionService } from './common/services/audit-retention.service';

import path from 'path';
import config from './config';

// Importar controladores
import authController from './modules/auth/auth.controller';
import pupController from './modules/pup/pup.controller';
import directivesController from './modules/directives/directives.controller';
import representativesController from './modules/representatives/representatives.controller';
import emergencyController from './modules/emergency/emergency.controller';
import hospitalController from './modules/hospital/hospital.controller';
import panicController from './modules/panic/panic.controller';
import insuranceController from './modules/insurance/insurance.controller';
import adminAuthController from './modules/admin/admin-auth.controller';
import adminController from './modules/admin/admin.controller';
import webauthnController from './modules/auth/webauthn.controller';
import paymentsController from './modules/payments/payments.controller';
import paymentsAdminController from './modules/payments/payments-admin.controller';
import paymentsWebhookController from './modules/payments/payments-webhook.controller';
import documentsController from './modules/documents/documents.controller';
import secureDownloadController, { getSecureLocalUrl } from './modules/documents/secure-download.controller';
import odooController from './modules/odoo/odoo.controller';
import walletController from './modules/wallet/wallet.controller';
import notificationController from './modules/notification/notification.controller';

// Inicializar generador de URLs seguras para S3 local
import { initSecureUrlGenerator } from './common/services/s3.service';
initSecureUrlGenerator(getSecureLocalUrl);

// Socket.io
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Inicializar Prisma
const prisma = new PrismaClient();

// Crear aplicación Express
const app = express();

// Crear servidor HTTP para Socket.io
const httpServer = createServer(app);

// Configurar Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    //origin: config.corsOrigins,
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Exportar io para uso en otros modulos
export { io };

// ==================== MIDDLEWARE GLOBAL ====================

// Seguridad - Configuración más permisiva para CORS en producción
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  // Remover completamente los headers restrictivos
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  // También remover otros headers que puedan interferir
  originAgentCluster: false,
  referrerPolicy: false,
}));

// CORS - permitir múltiples orígenes
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Headers de seguridad adicionales
app.use(securityHeaders);

// Middleware para forzar headers CORS (después de Helmet)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Solo añadir headers CORS si la request viene de un origen permitido
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  next();
});

// Protección CSRF (validación de Origin/Referer)
app.use(csrfProtection);

// Compresión
app.use(compression());

// Logging
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// Logger estructurado con requestId
app.use(requestLogger);

// IMPORTANTE: Webhook de Stripe necesita body raw (antes de express.json)
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }), paymentsWebhookController);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NOTA: Los archivos locales ahora se sirven a través de /api/v1/secure-download
// con tokens temporales para mayor seguridad. Ver secure-download.controller.ts
// El endpoint express.static fue removido por vulnerabilidad de acceso no autenticado.
if (config.env === 'development') {
  console.log('🔒 Archivos locales servidos vía /api/v1/secure-download (autenticado)');
}

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Registrar en métricas de seguridad
    securityMetrics.recordRateLimitHit(
      req.ip || req.socket.remoteAddress || 'unknown',
      req.path
    );
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
      },
    });
  },
});
app.use(globalLimiter);

// Rate limiting estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: config.env === 'development' ? 100 : 50, // 50 intentos en producción
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Demasiados intentos de autenticación. Por favor, espere 15 minutos.',
    },
  },
});

// ==================== RUTAS DE SALUD ====================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.env,
  });
});

app.get('/api/v1/health', async (req: Request, res: Response) => {
  try {
    // Verificar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: 'connected',
        api: 'running',
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        api: 'running',
      },
    });
  }
});

// ==================== RUTAS DE API ====================

// Autenticación (con rate limiting estricto)
app.use('/api/v1/auth', authLimiter, authController);

// WebAuthn / Biometría (con rate limiting)
app.use('/api/v1/auth/webauthn', authLimiter, webauthnController);

// Perfil del paciente
app.use('/api/v1/profile', pupController);

// Directivas de voluntad anticipada
app.use('/api/v1/directives', directivesController);

// Representantes
app.use('/api/v1/representatives', representativesController);

// Alertas de panico (Definir antes de emergency para evitar shadowing)
app.use('/api/v1/emergency/panic', panicController);

// Acceso de emergencia
app.use('/api/v1/emergency', emergencyController);

// Hospitales
app.use('/api/v1/hospitals', hospitalController);

// Aseguradoras (público para selector de perfil)
app.use('/api/v1/insurance', insuranceController);



// Pagos y suscripciones
app.use('/api/v1/payments', paymentsController);

// Documentos medicos
app.use('/api/v1/documents', documentsController);

// Descarga segura de archivos (con tokens temporales)
app.use('/api/v1/secure-download', secureDownloadController);

// Wallet (Apple/Google Wallet passes)
app.use('/api/v1/wallet', walletController);

// Diagnóstico de notificaciones
app.use('/api/v1/notifications', notificationController);

// ==================== RUTAS DE ADMINISTRACION ====================

// Autenticacion de administradores (con rate limiting)
app.use('/api/v1/admin/auth', authLimiter, adminAuthController);

// Endpoints de administracion (requieren auth admin)
app.use('/api/v1/admin', adminController);

// Administracion de pagos y suscripciones
app.use('/api/v1/admin/payments', paymentsAdminController);

// Integracion con Odoo (ERP/Contabilidad)
app.use('/api/v1/admin/odoo', odooController);

// ==================== MANEJO DE ERRORES ====================

// Ruta no encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.method} ${req.path} no encontrada`,
    },
  });
});

// Error handler global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error no manejado:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.env === 'production'
        ? 'Error interno del servidor'
        : err.message,
    },
  });
});

// ==================== INICIAR SERVIDOR ====================

const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log(`📝 Configuración: Port=${config.port}, Env=${config.env}`);

    // Conectar a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // Configurar eventos de Socket.io
    io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Unirse a una sala por userId (para recibir alertas)
      socket.on('join-user', (userId: string) => {
        socket.join(`user-${userId}`);
        console.log(`👤 Usuario ${userId} unido a su sala`);
      });

      // Unirse a sala de representante
      socket.on('join-representative', (userId: string) => {
        socket.join(`representative-${userId}`);
        console.log(`👥 Representante unido a sala de usuario ${userId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
      });
    });

    // Iniciar servidor HTTP con Socket.io
    httpServer.listen(config.port, () => {
      logger.info('Sistema VIDA Backend iniciado', {
        port: config.port,
        environment: config.env,
      });

      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏥 Sistema VIDA - Backend API                              ║
║   Vinculación de Información para Decisiones y Alertas       ║
║                                                               ║
║   🌐 Servidor: http://localhost:${config.port}                     ║
║   📚 API Base: http://localhost:${config.port}/api/v1              ║
║   🔌 WebSocket: ws://localhost:${config.port}                      ║
║   🔧 Entorno: ${config.env.padEnd(42)}║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);

      // ═══════════════════════════════════════════════════════════════
      // TAREAS PROGRAMADAS
      // ═══════════════════════════════════════════════════════════════

      // Ejecutar retención de logs una vez al día (a las 3:00 AM)
      const scheduleAuditRetention = () => {
        const now = new Date();
        const next3AM = new Date(now);
        next3AM.setHours(3, 0, 0, 0);
        if (next3AM <= now) {
          next3AM.setDate(next3AM.getDate() + 1);
        }
        const msUntil3AM = next3AM.getTime() - now.getTime();

        setTimeout(async () => {
          logger.info('Ejecutando retención de logs programada');
          try {
            await auditRetentionService.executeRetentionPolicies();
          } catch (error) {
            logger.error('Error en retención de logs', error);
          }
          // Reprogramar para mañana
          setInterval(async () => {
            logger.info('Ejecutando retención de logs programada');
            try {
              await auditRetentionService.executeRetentionPolicies();
            } catch (error) {
              logger.error('Error en retención de logs', error);
            }
          }, 24 * 60 * 60 * 1000); // Cada 24 horas
        }, msUntil3AM);

        logger.info(`Retención de logs programada para ${next3AM.toISOString()}`);
      };

      scheduleAuditRetention();
    });
  } catch (error) {
    console.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales de terminación
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar
startServer();

export default app;
