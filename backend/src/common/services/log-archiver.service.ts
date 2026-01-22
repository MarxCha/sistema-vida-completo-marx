// src/common/services/log-archiver.service.ts
/**
 * Servicio de Archivado y Rotación de Logs
 *
 * Funcionalidades:
 * - Rotación automática de logs por tamaño o tiempo
 * - Compresión de logs antiguos (gzip)
 * - Limpieza de logs expirados
 * - Exportación a S3 (opcional)
 * - Búsqueda en logs históricos
 *
 * En producción, se recomienda usar servicios como:
 * - CloudWatch Logs
 * - ELK Stack (Elasticsearch, Logstash, Kibana)
 * - Datadog
 *
 * Este servicio es para logs locales en desarrollo/staging.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import config from '../../config';
import { logger } from './logger.service';

const gzip = promisify(zlib.gzip);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

const ARCHIVER_CONFIG = {
  logsDir: process.env.LOGS_DIR || path.join(process.cwd(), 'logs'),
  maxFileSizeMB: parseInt(process.env.LOG_MAX_SIZE_MB || '10'),
  maxAgeDays: parseInt(process.env.LOG_MAX_AGE_DAYS || '30'),
  compressAfterDays: parseInt(process.env.LOG_COMPRESS_AFTER_DAYS || '1'),
  archiveEnabled: process.env.LOG_ARCHIVE_ENABLED !== 'false',
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface LogFile {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isCompressed: boolean;
}

interface ArchiveStats {
  totalFiles: number;
  totalSizeMB: number;
  oldestLog: Date | null;
  newestLog: Date | null;
  compressedFiles: number;
}

interface LogSearchResult {
  file: string;
  line: number;
  content: string;
  timestamp?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

class LogArchiverService {
  private logsDir: string;
  private currentLogFile: string | null = null;
  private rotationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logsDir = ARCHIVER_CONFIG.logsDir;
    this.ensureLogsDirectory();
  }

  /**
   * Inicializa el servicio de archivado
   */
  initialize(): void {
    if (!ARCHIVER_CONFIG.archiveEnabled) {
      logger.info('Log archiver deshabilitado');
      return;
    }

    this.ensureLogsDirectory();

    // Ejecutar rotación cada hora
    this.rotationInterval = setInterval(() => {
      this.performMaintenance().catch(err => {
        logger.error('Error en mantenimiento de logs', err);
      });
    }, 60 * 60 * 1000); // 1 hora

    // Ejecutar mantenimiento inicial
    this.performMaintenance().catch(err => {
      logger.error('Error en mantenimiento inicial de logs', err);
    });

    logger.info('Log archiver inicializado', {
      logsDir: this.logsDir,
      maxSizeMB: ARCHIVER_CONFIG.maxFileSizeMB,
      maxAgeDays: ARCHIVER_CONFIG.maxAgeDays,
    });
  }

  /**
   * Detiene el servicio
   */
  shutdown(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
  }

  /**
   * Escribe una entrada de log a archivo
   */
  async writeLog(entry: object): Promise<void> {
    if (!ARCHIVER_CONFIG.archiveEnabled) return;

    const logFile = this.getCurrentLogFile();
    const line = JSON.stringify(entry) + '\n';

    try {
      fs.appendFileSync(logFile, line, 'utf8');

      // Verificar si necesita rotación
      const stats = fs.statSync(logFile);
      if (stats.size > ARCHIVER_CONFIG.maxFileSizeMB * 1024 * 1024) {
        await this.rotateCurrentLog();
      }
    } catch (error) {
      // Silenciar errores de escritura para no afectar la aplicación
      logger.error('Error escribiendo log:', error);
    }
  }

  /**
   * Realiza mantenimiento: rotación, compresión y limpieza
   */
  async performMaintenance(): Promise<void> {
    logger.debug('Iniciando mantenimiento de logs');

    // 1. Comprimir logs antiguos
    await this.compressOldLogs();

    // 2. Eliminar logs expirados
    await this.deleteExpiredLogs();

    logger.debug('Mantenimiento de logs completado');
  }

  /**
   * Obtiene estadísticas del archivo de logs
   */
  async getStats(): Promise<ArchiveStats> {
    const files = await this.listLogFiles();

    let totalSize = 0;
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;
    let compressedCount = 0;

    for (const file of files) {
      totalSize += file.size;

      if (!oldestDate || file.createdAt < oldestDate) {
        oldestDate = file.createdAt;
      }
      if (!newestDate || file.modifiedAt > newestDate) {
        newestDate = file.modifiedAt;
      }
      if (file.isCompressed) {
        compressedCount++;
      }
    }

    return {
      totalFiles: files.length,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      oldestLog: oldestDate,
      newestLog: newestDate,
      compressedFiles: compressedCount,
    };
  }

  /**
   * Lista todos los archivos de log
   */
  async listLogFiles(): Promise<LogFile[]> {
    if (!fs.existsSync(this.logsDir)) {
      return [];
    }

    const files = fs.readdirSync(this.logsDir);
    const logFiles: LogFile[] = [];

    for (const name of files) {
      if (!name.endsWith('.log') && !name.endsWith('.log.gz')) {
        continue;
      }

      const filePath = path.join(this.logsDir, name);
      const stats = fs.statSync(filePath);

      logFiles.push({
        name,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isCompressed: name.endsWith('.gz'),
      });
    }

    return logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  }

  /**
   * Busca en los logs
   */
  async searchLogs(
    query: string,
    options?: { startDate?: Date; endDate?: Date; limit?: number }
  ): Promise<LogSearchResult[]> {
    const { startDate, endDate, limit = 100 } = options || {};
    const results: LogSearchResult[] = [];
    const files = await this.listLogFiles();

    for (const file of files) {
      // Filtrar por fecha si se especifica
      if (startDate && file.modifiedAt < startDate) continue;
      if (endDate && file.createdAt > endDate) continue;

      try {
        let content: string;

        if (file.isCompressed) {
          const compressed = fs.readFileSync(file.path);
          const decompressed = zlib.gunzipSync(compressed);
          content = decompressed.toString('utf8');
        } else {
          content = fs.readFileSync(file.path, 'utf8');
        }

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query.toLowerCase())) {
            results.push({
              file: file.name,
              line: i + 1,
              content: lines[i],
              timestamp: this.extractTimestamp(lines[i]),
            });

            if (results.length >= limit) {
              return results;
            }
          }
        }
      } catch (error) {
        // Ignorar archivos que no se pueden leer
      }
    }

    return results;
  }

  /**
   * Exporta logs de un rango de fechas
   */
  async exportLogs(startDate: Date, endDate: Date): Promise<string> {
    const files = await this.listLogFiles();
    const exportPath = path.join(this.logsDir, `export-${Date.now()}.log`);
    const writeStream = fs.createWriteStream(exportPath);

    for (const file of files) {
      if (file.modifiedAt < startDate || file.createdAt > endDate) continue;

      try {
        let content: string;

        if (file.isCompressed) {
          const compressed = fs.readFileSync(file.path);
          const decompressed = zlib.gunzipSync(compressed);
          content = decompressed.toString('utf8');
        } else {
          content = fs.readFileSync(file.path, 'utf8');
        }

        // Filtrar líneas por fecha
        const lines = content.split('\n');
        for (const line of lines) {
          const timestamp = this.extractTimestamp(line);
          if (timestamp) {
            const logDate = new Date(timestamp);
            if (logDate >= startDate && logDate <= endDate) {
              writeStream.write(line + '\n');
            }
          }
        }
      } catch (error) {
        // Ignorar errores
      }
    }

    writeStream.end();

    return exportPath;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getCurrentLogFile(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `app-${date}.log`);
  }

  private async rotateCurrentLog(): Promise<void> {
    const currentFile = this.getCurrentLogFile();

    if (!fs.existsSync(currentFile)) return;

    const timestamp = Date.now();
    const rotatedFile = currentFile.replace('.log', `-${timestamp}.log`);

    fs.renameSync(currentFile, rotatedFile);
    logger.info('Log rotado', { from: currentFile, to: rotatedFile });
  }

  private async compressOldLogs(): Promise<void> {
    const files = await this.listLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVER_CONFIG.compressAfterDays);

    for (const file of files) {
      if (file.isCompressed) continue;
      if (file.modifiedAt > cutoffDate) continue;

      // No comprimir el archivo actual
      const currentLog = this.getCurrentLogFile();
      if (file.path === currentLog) continue;

      try {
        const content = fs.readFileSync(file.path);
        const compressed = await gzip(content);
        const compressedPath = file.path + '.gz';

        fs.writeFileSync(compressedPath, compressed);
        fs.unlinkSync(file.path);

        logger.debug('Log comprimido', { file: file.name });
      } catch (error) {
        logger.error('Error comprimiendo log', error, { file: file.name });
      }
    }
  }

  private async deleteExpiredLogs(): Promise<void> {
    const files = await this.listLogFiles();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ARCHIVER_CONFIG.maxAgeDays);

    for (const file of files) {
      if (file.modifiedAt > cutoffDate) continue;

      try {
        fs.unlinkSync(file.path);
        logger.info('Log expirado eliminado', { file: file.name });
      } catch (error) {
        logger.error('Error eliminando log', error, { file: file.name });
      }
    }
  }

  private extractTimestamp(logLine: string): string | undefined {
    try {
      const parsed = JSON.parse(logLine);
      return parsed.timestamp;
    } catch {
      // Intentar extraer timestamp con regex
      const match = logLine.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      return match ? match[0] : undefined;
    }
  }
}

export const logArchiverService = new LogArchiverService();
export default logArchiverService;
