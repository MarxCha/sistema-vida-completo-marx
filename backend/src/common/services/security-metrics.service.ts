// src/common/services/security-metrics.service.ts
/**
 * Servicio de Métricas de Seguridad
 *
 * Rastrea y reporta eventos de seguridad para:
 * - Detección de ataques (brute force, credential stuffing)
 * - Monitoreo de salud del sistema
 * - Alertas automáticas
 * - Dashboards de seguridad
 */

import { logger } from './logger.service';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

interface MetricCounter {
  count: number;
  lastUpdated: Date;
  details: Map<string, number>; // Para desglose por IP, email, etc.
}

interface SecurityAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  context: Record<string, any>;
}

// Umbrales para alertas
const ALERT_THRESHOLDS = {
  // Intentos fallidos de login por IP en 15 min
  FAILED_LOGIN_PER_IP: 10,
  // Intentos fallidos de login por email en 15 min
  FAILED_LOGIN_PER_EMAIL: 5,
  // Accesos de emergencia por usuario en 24h
  EMERGENCY_ACCESS_PER_USER: 20,
  // Rate limit hits por IP en 5 min
  RATE_LIMIT_HITS_PER_IP: 50,
  // Tokens inválidos por IP en 15 min
  INVALID_TOKENS_PER_IP: 20,
};

// Ventanas de tiempo para métricas (ms)
const TIME_WINDOWS = {
  SHORT: 5 * 60 * 1000, // 5 minutos
  MEDIUM: 15 * 60 * 1000, // 15 minutos
  LONG: 60 * 60 * 1000, // 1 hora
  DAY: 24 * 60 * 60 * 1000, // 24 horas
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO DE MÉTRICAS
// ═══════════════════════════════════════════════════════════════════════════

class SecurityMetricsService {
  // Contadores de métricas
  private failedLogins: MetricCounter;
  private successfulLogins: MetricCounter;
  private emergencyAccesses: MetricCounter;
  private rateLimitHits: MetricCounter;
  private invalidTokens: MetricCounter;
  private mfaFailures: MetricCounter;
  private passwordResets: MetricCounter;
  private suspiciousActivities: MetricCounter;

  // Historial de alertas
  private alerts: SecurityAlert[] = [];
  private alertCallbacks: ((alert: SecurityAlert) => void)[] = [];

  constructor() {
    this.failedLogins = this.createCounter();
    this.successfulLogins = this.createCounter();
    this.emergencyAccesses = this.createCounter();
    this.rateLimitHits = this.createCounter();
    this.invalidTokens = this.createCounter();
    this.mfaFailures = this.createCounter();
    this.passwordResets = this.createCounter();
    this.suspiciousActivities = this.createCounter();

    // Limpiar métricas antiguas cada hora
    setInterval(() => this.cleanupOldMetrics(), TIME_WINDOWS.LONG);
  }

  private createCounter(): MetricCounter {
    return {
      count: 0,
      lastUpdated: new Date(),
      details: new Map(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRO DE EVENTOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Registra un intento de login fallido
   */
  recordFailedLogin(ip: string, email?: string, reason?: string): void {
    this.incrementCounter(this.failedLogins, ip);
    if (email) {
      this.incrementCounter(this.failedLogins, `email:${email}`);
    }

    logger.security('Failed login attempt', {
      event: 'FAILED_LOGIN',
      ip,
      email: email || 'unknown',
      reason,
    });

    // Verificar umbrales
    this.checkThreshold(
      'FAILED_LOGIN_PER_IP',
      this.getCountForKey(this.failedLogins, ip),
      ALERT_THRESHOLDS.FAILED_LOGIN_PER_IP,
      { ip, email }
    );

    if (email) {
      this.checkThreshold(
        'FAILED_LOGIN_PER_EMAIL',
        this.getCountForKey(this.failedLogins, `email:${email}`),
        ALERT_THRESHOLDS.FAILED_LOGIN_PER_EMAIL,
        { ip, email }
      );
    }
  }

  /**
   * Registra un login exitoso
   */
  recordSuccessfulLogin(ip: string, userId: string): void {
    this.incrementCounter(this.successfulLogins, ip);
    this.incrementCounter(this.successfulLogins, `user:${userId}`);

    logger.security('Successful login', {
      event: 'SUCCESSFUL_LOGIN',
      ip,
      userId,
    });

    // Resetear contadores de fallos para este IP/usuario
    this.failedLogins.details.delete(ip);
    this.failedLogins.details.delete(`email:${userId}`);
  }

  /**
   * Registra un acceso de emergencia
   */
  recordEmergencyAccess(accessorIp: string, patientId: string, accessType: string): void {
    this.incrementCounter(this.emergencyAccesses, accessorIp);
    this.incrementCounter(this.emergencyAccesses, `patient:${patientId}`);

    logger.security('Emergency access', {
      event: 'EMERGENCY_ACCESS',
      ip: accessorIp,
      patientId,
      accessType,
    });

    // Verificar umbral
    this.checkThreshold(
      'EMERGENCY_ACCESS_PER_USER',
      this.getCountForKey(this.emergencyAccesses, `patient:${patientId}`),
      ALERT_THRESHOLDS.EMERGENCY_ACCESS_PER_USER,
      { patientId, accessorIp }
    );
  }

  /**
   * Registra un hit de rate limiting
   */
  recordRateLimitHit(ip: string, path: string): void {
    this.incrementCounter(this.rateLimitHits, ip);

    logger.warn('Rate limit hit', {
      event: 'RATE_LIMIT_HIT',
      ip,
      path,
    });

    this.checkThreshold(
      'RATE_LIMIT_HITS_PER_IP',
      this.getCountForKey(this.rateLimitHits, ip),
      ALERT_THRESHOLDS.RATE_LIMIT_HITS_PER_IP,
      { ip, path }
    );
  }

  /**
   * Registra un token inválido
   */
  recordInvalidToken(ip: string, tokenType: string, reason: string): void {
    this.incrementCounter(this.invalidTokens, ip);

    logger.security('Invalid token', {
      event: 'INVALID_TOKEN',
      ip,
      tokenType,
      reason,
    });

    this.checkThreshold(
      'INVALID_TOKENS_PER_IP',
      this.getCountForKey(this.invalidTokens, ip),
      ALERT_THRESHOLDS.INVALID_TOKENS_PER_IP,
      { ip, tokenType }
    );
  }

  /**
   * Registra un fallo de MFA
   */
  recordMFAFailure(ip: string, adminId: string): void {
    this.incrementCounter(this.mfaFailures, ip);
    this.incrementCounter(this.mfaFailures, `admin:${adminId}`);

    logger.security('MFA verification failed', {
      event: 'MFA_FAILURE',
      ip,
      adminId,
    });
  }

  /**
   * Registra una solicitud de reset de contraseña
   */
  recordPasswordReset(ip: string, email: string): void {
    this.incrementCounter(this.passwordResets, ip);
    this.incrementCounter(this.passwordResets, `email:${email}`);

    logger.security('Password reset requested', {
      event: 'PASSWORD_RESET_REQUEST',
      ip,
      email,
    });
  }

  /**
   * Registra actividad sospechosa
   */
  recordSuspiciousActivity(type: string, ip: string, details: Record<string, any>): void {
    this.incrementCounter(this.suspiciousActivities, ip);
    this.incrementCounter(this.suspiciousActivities, `type:${type}`);

    logger.security(`Suspicious activity: ${type}`, {
      event: 'SUSPICIOUS_ACTIVITY',
      activityType: type,
      ip,
      ...details,
    });

    // Crear alerta inmediata para actividad sospechosa
    this.createAlert({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'high',
      message: `Suspicious activity detected: ${type}`,
      timestamp: new Date(),
      context: { ip, type, ...details },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OBTENCIÓN DE MÉTRICAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene resumen de métricas actuales
   */
  getMetricsSummary(): {
    failedLogins: number;
    successfulLogins: number;
    emergencyAccesses: number;
    rateLimitHits: number;
    invalidTokens: number;
    mfaFailures: number;
    activeAlerts: number;
    topOffendingIPs: Array<{ ip: string; count: number }>;
  } {
    return {
      failedLogins: this.failedLogins.count,
      successfulLogins: this.successfulLogins.count,
      emergencyAccesses: this.emergencyAccesses.count,
      rateLimitHits: this.rateLimitHits.count,
      invalidTokens: this.invalidTokens.count,
      mfaFailures: this.mfaFailures.count,
      activeAlerts: this.alerts.filter(
        a => Date.now() - a.timestamp.getTime() < TIME_WINDOWS.LONG
      ).length,
      topOffendingIPs: this.getTopOffenders(this.failedLogins, 5),
    };
  }

  /**
   * Obtiene alertas recientes
   */
  getRecentAlerts(limit: number = 20): SecurityAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Obtiene métricas detalladas para un IP
   */
  getIPMetrics(ip: string): {
    failedLogins: number;
    rateLimitHits: number;
    invalidTokens: number;
    suspiciousActivities: number;
  } {
    return {
      failedLogins: this.getCountForKey(this.failedLogins, ip),
      rateLimitHits: this.getCountForKey(this.rateLimitHits, ip),
      invalidTokens: this.getCountForKey(this.invalidTokens, ip),
      suspiciousActivities: this.getCountForKey(this.suspiciousActivities, ip),
    };
  }

  /**
   * Registra callback para alertas
   */
  onAlert(callback: (alert: SecurityAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private incrementCounter(counter: MetricCounter, key: string): void {
    counter.count++;
    counter.lastUpdated = new Date();
    counter.details.set(key, (counter.details.get(key) || 0) + 1);
  }

  private getCountForKey(counter: MetricCounter, key: string): number {
    return counter.details.get(key) || 0;
  }

  private getTopOffenders(counter: MetricCounter, limit: number): Array<{ ip: string; count: number }> {
    const entries = Array.from(counter.details.entries())
      .filter(([key]) => !key.includes(':')) // Solo IPs directas
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return entries;
  }

  private checkThreshold(
    type: string,
    current: number,
    threshold: number,
    context: Record<string, any>
  ): void {
    if (current >= threshold) {
      const severity = current >= threshold * 2 ? 'critical' : current >= threshold * 1.5 ? 'high' : 'medium';

      this.createAlert({
        type,
        severity,
        message: `Threshold exceeded: ${type} (${current}/${threshold})`,
        timestamp: new Date(),
        context,
      });
    }
  }

  private createAlert(alert: SecurityAlert): void {
    this.alerts.push(alert);

    // Mantener solo las últimas 1000 alertas
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Log de la alerta
    logger.security(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, {
      alertType: alert.type,
      severity: alert.severity,
      ...alert.context,
    });

    // Notificar callbacks
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Error in alert callback', error);
      }
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - TIME_WINDOWS.DAY;

    // Limpiar contadores si no han sido actualizados en 24h
    const counters = [
      this.failedLogins,
      this.rateLimitHits,
      this.invalidTokens,
      this.mfaFailures,
    ];

    for (const counter of counters) {
      if (counter.lastUpdated.getTime() < cutoff) {
        counter.count = 0;
        counter.details.clear();
      }
    }

    // Limpiar alertas antiguas (mantener 7 días)
    const alertCutoff = Date.now() - 7 * TIME_WINDOWS.DAY;
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > alertCutoff);

    logger.debug('Security metrics cleanup completed');
  }
}

// Singleton
export const securityMetrics = new SecurityMetricsService();
export default securityMetrics;
