// src/types/admin.ts

// Roles de administrador
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'VIEWER' | 'SUPPORT';

// Usuario administrador
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: string[];
  isSuperAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

// Respuesta de login admin
export interface AdminLoginResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
}

// Metricas del dashboard
export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    verified: number;
    newToday: number;
  };
  directives: {
    total: number;
    active: number;
  };
  emergency: {
    totalAccesses: number;
    accessesToday: number;
    totalAlerts: number;
    activeAlerts: number;
    alertsToday: number;
  };
  institutions: {
    total: number;
    verified: number;
  };
}

// Metricas de usuarios
export interface UserMetrics {
  timeline: { date: string; count: number }[];
  period: string;
  startDate: string;
  endDate: string;
  distribution: {
    sex: Record<string, number>;
  };
  completeness: {
    total: number;
    withProfile: number;
    withDirective: number;
    withRepresentatives: number;
  };
}

// Metricas de emergencia
export interface EmergencyMetrics {
  period: string;
  startDate: string;
  endDate: string;
  accesses: {
    total: number;
    timeline: { date: string; count: number }[];
    byInstitution: Record<string, number>;
    byRole: Record<string, number>;
    recent: {
      id: string;
      accessedAt: string;
      accessorName: string;
      accessorRole: string;
      institution?: string;
      dataAccessed: string[];
    }[];
  };
  alerts: {
    total: number;
    byStatus: Record<string, number>;
    active: number;
  };
}

// Usuario del sistema (paciente)
export interface SystemUser {
  id: string;
  email: string;
  curp: string;
  name: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count?: {
    directives: number;
    representatives: number;
    emergencyAccesses: number;
    panicAlerts: number;
  };
}

// Detalle de usuario
export interface SystemUserDetail extends SystemUser {
  dateOfBirth?: string;
  sex?: string;
  address?: string;
  profile?: {
    bloodType?: string;
    insuranceProvider?: string;
    insurancePolicy?: string;
    isDonor: boolean;
    photoUrl?: string;
    qrToken: string;
    createdAt: string;
    updatedAt: string;
  };
  directives: {
    id: string;
    type: string;
    status: string;
    nom151Sealed: boolean;
    originState?: string;
    createdAt: string;
    updatedAt: string;
  }[];
  representatives: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    relation: string;
    priority: number;
    isDonorSpokesperson: boolean;
    notifyOnEmergency: boolean;
  }[];
  emergencyAccesses: {
    id: string;
    accessorName: string;
    accessorRole: string;
    institutionName?: string;
    dataAccessed: string[];
    accessedAt: string;
    latitude?: number;
    longitude?: number;
  }[];
  panicAlerts: {
    id: string;
    status: string;
    latitude: number;
    longitude: number;
    locationName?: string;
    createdAt: string;
    cancelledAt?: string;
    resolvedAt?: string;
  }[];
  sessions: {
    id: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: string;
    expiresAt: string;
  }[];
}

// Paginacion
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Respuesta paginada
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Log de auditoria
export interface AuditLog {
  id: string;
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  actorType: string;
  actorId?: string;
  actorName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Log de auditoria de admin
export interface AdminAuditLog {
  id: string;
  adminId: string;
  admin: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Acceso de emergencia
export interface EmergencyAccess {
  id: string;
  patientId: string;
  patient?: {
    id: string;
    name: string;
    email: string;
    curp: string;
  };
  accessorName: string;
  accessorRole: string;
  accessorLicense?: string;
  institutionId?: string;
  institution?: {
    id: string;
    name: string;
    type: string;
  };
  institutionName?: string;
  qrTokenUsed: string;
  dataAccessed: string[];
  latitude?: number;
  longitude?: number;
  locationName?: string;
  accessedAt: string;
  expiresAt: string;
}

// Alerta de panico
export interface PanicAlert {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationName?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'RESOLVED' | 'EXPIRED';
  message?: string;
  createdAt: string;
  cancelledAt?: string;
  resolvedAt?: string;
}

// Institucion medica
export interface MedicalInstitution {
  id: string;
  name: string;
  type: string;
  cluesCode?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  emergencyPhone?: string;
  attentionLevel?: 'FIRST' | 'SECOND' | 'THIRD';
  specialties: string[];
  hasEmergency: boolean;
  has24Hours: boolean;
  hasICU: boolean;
  hasTrauma: boolean;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  _count?: {
    emergencyAccesses: number;
    staff: number;
  };
}

// Estado de salud del sistema
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  responseTime: number;
  database: ServiceStatus;
  services: ServiceStatus[];
  system: {
    environment: string;
    nodeVersion: string;
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    config: {
      port: number;
      frontendUrl: string;
    };
  };
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastCheck: string;
  details?: any;
  optional?: boolean; // Servicios opcionales no afectan estado general en desarrollo
}

// Estadisticas de auditoria
export interface AuditStats {
  totals: {
    userLogs: number;
    adminLogs: number;
  };
  recent: {
    last24h: number;
    last7d: number;
  };
  topActions: { action: string; count: number }[];
  topResources: { resource: string; count: number }[];
}

// Estadisticas de instituciones
export interface InstitutionStats {
  total: number;
  verified: number;
  withEmergency: number;
  with24Hours: number;
  byType: Record<string, number>;
  byState: Record<string, number>;
  byLevel: Record<string, number>;
}

// ==================== ASEGURADORAS ====================

export type InsuranceType = 'HEALTH' | 'LIFE' | 'ACCIDENT' | 'HEALTH_LIFE' | 'GOVERNMENT' | 'OTHER';

export interface InsuranceCompany {
  id: string;
  name: string;
  shortName?: string;
  type: InsuranceType;
  cnsfNumber?: string;
  rfc?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  emergencyPhone?: string;
  email?: string;
  website?: string;
  coverageTypes: string[];
  networkSize?: number;
  hasNationalCoverage: boolean;
  statesCovered: string[];
  logoUrl?: string;
  description?: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  apiEnabled: boolean;
  apiEndpoint?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  plans?: InsurancePlan[];
  networkHospitals?: MedicalInstitution[];
  _count?: {
    plans: number;
    networkHospitals: number;
    emergencyAccesses: number;
  };
}

export interface InsurancePlan {
  id: string;
  insuranceId: string;
  name: string;
  code?: string;
  sumAssured?: number;
  deductible?: number;
  coinsurance?: number;
  features: string[];
  exclusions: string[];
  hospitalLevel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceStats {
  total: number;
  byType: Record<string, number>;
  verified: number;
  unverified: number;
  withNationalCoverage: number;
  totalPlans: number;
  recentAccessesWithInsurance: number;
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  HEALTH: 'Gastos Médicos',
  LIFE: 'Vida',
  ACCIDENT: 'Accidentes',
  HEALTH_LIFE: 'Salud y Vida',
  GOVERNMENT: 'Gobierno',
  OTHER: 'Otro',
};

export const INSURANCE_TYPE_COLORS: Record<InsuranceType, string> = {
  HEALTH: 'bg-blue-100 text-blue-800',
  LIFE: 'bg-purple-100 text-purple-800',
  ACCIDENT: 'bg-orange-100 text-orange-800',
  HEALTH_LIFE: 'bg-green-100 text-green-800',
  GOVERNMENT: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

// Permisos del sistema
export const ADMIN_PERMISSIONS = {
  METRICS_READ: 'metrics:read',
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  INSTITUTIONS_READ: 'institutions:read',
  INSTITUTIONS_WRITE: 'institutions:write',
  HEALTH_READ: 'health:read',
  ADMINS_READ: 'admins:read',
  ADMINS_WRITE: 'admins:write',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
} as const;

// Labels para roles
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  MODERATOR: 'Moderador',
  VIEWER: 'Visor',
  SUPPORT: 'Soporte',
};

// Colores para roles
export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800',
  ADMIN: 'bg-purple-100 text-purple-800',
  MODERATOR: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
  SUPPORT: 'bg-green-100 text-green-800',
};
