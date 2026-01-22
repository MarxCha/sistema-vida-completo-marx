# Sistema VIDA - MVP Fase 1

**V**inculación de **I**nformación para **D**ecisiones y **A**lertas

Sistema integral para la gestión de voluntades anticipadas y acceso de emergencia a información médica crítica en México.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Seguridad](#seguridad)
- [Roadmap](#roadmap)

## 📖 Descripción

Sistema VIDA es una plataforma que permite a los ciudadanos mexicanos:

1. **Perfil Unificado del Paciente (PUP)**: Almacenar información médica crítica (alergias, condiciones, medicamentos, tipo de sangre)
2. **Gestión de Voluntades Anticipadas**: Crear, validar y gestionar directivas de voluntad anticipada con soporte para documentos notariados y borradores digitales
3. **Protocolo de Acceso de Emergencia (PAE)**: Permitir que personal médico acceda a información vital mediante código QR
4. **Representantes**: Designar contactos de emergencia y voceros de donación de órganos

### Características Principales

- ✅ Encriptación AES-256-GCM para datos sensibles
- ✅ Autenticación JWT con refresh tokens
- ✅ Validación de CURP
- ✅ Generación de QR para acceso de emergencia
- ✅ Auditoría completa de accesos
- ✅ Integración preparada para NOM-151 (sellado electrónico)
- ✅ Soporte para múltiples estados con diferentes marcos legales

## 🏗️ Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   React/Vite    │     │   Express/TS    │     │   + Redis       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   PWA/Mobile    │     │   AWS S3        │
│   (Fase 2)      │     │   Documentos    │
└─────────────────┘     └─────────────────┘
```

## 🛠️ Tecnologías

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js con TypeScript
- **ORM**: Prisma
- **Base de datos**: PostgreSQL 15+
- **Cache**: Redis
- **Autenticación**: JWT (jsonwebtoken)
- **Encriptación**: AES-256-GCM (crypto nativo)
- **Validación**: express-validator + Zod
- **QR**: qrcode

### Frontend
- **Framework**: React 18 con TypeScript
- **Build**: Vite
- **Estilos**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Estado**: Context API

## 📋 Requisitos Previos

- Node.js 18.x o superior
- PostgreSQL 15+
- Redis 7+
- npm o yarn

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-org/sistema-vida.git
cd sistema-vida
```

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor de desarrollo
npm run dev
```

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 4. Docker (Alternativa)

```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## ⚙️ Configuración

### Variables de Entorno (Backend)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/vida` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Secreto para tokens | `tu-secreto-super-seguro-min-32-chars` |
| `ENCRYPTION_KEY` | Clave AES-256 (64 hex) | `0123456789abcdef...` |
| `FRONTEND_URL` | URL del frontend | `http://localhost:5173` |

Ver `.env.example` para la lista completa.

## 📁 Estructura del Proyecto

```
sistema-vida/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Esquema de base de datos
│   ├── src/
│   │   ├── common/
│   │   │   ├── guards/         # Middleware de autenticación
│   │   │   └── utils/          # Utilidades (encriptación, QR)
│   │   ├── config/             # Configuración centralizada
│   │   ├── modules/
│   │   │   ├── auth/           # Autenticación
│   │   │   ├── pup/            # Perfil del paciente
│   │   │   ├── directives/     # Voluntades anticipadas
│   │   │   ├── representatives/# Representantes
│   │   │   └── emergency/      # Acceso de emergencia
│   │   └── main.ts             # Punto de entrada
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layouts/        # Layouts principales
│   │   │   └── pages/          # Páginas
│   │   ├── context/            # Context de React
│   │   ├── services/           # API clients
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── docker-compose.yml
```

## 🔌 API Endpoints

### Autenticación (`/api/v1/auth`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/register` | Registro de usuario |
| POST | `/login` | Inicio de sesión |
| POST | `/refresh` | Refrescar tokens |
| POST | `/logout` | Cerrar sesión |
| POST | `/verify-email` | Verificar email |
| POST | `/forgot-password` | Solicitar reset |
| POST | `/reset-password` | Cambiar contraseña |
| GET | `/me` | Usuario actual |

### Perfil (`/api/v1/profile`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Obtener perfil |
| PUT | `/` | Actualizar perfil |
| POST | `/photo` | Actualizar foto |
| GET | `/qr` | Obtener código QR |
| POST | `/qr/regenerate` | Regenerar QR |

### Directivas (`/api/v1/directives`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar directivas |
| GET | `/active` | Directiva activa |
| GET | `/:id` | Obtener directiva |
| POST | `/draft` | Crear borrador |
| POST | `/upload` | Subir documento |
| PUT | `/:id` | Actualizar borrador |
| POST | `/:id/validate` | Validar directiva |
| POST | `/:id/seal` | Sellado NOM-151 |
| POST | `/:id/revoke` | Revocar |
| DELETE | `/:id` | Eliminar borrador |

### Representantes (`/api/v1/representatives`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar representantes |
| POST | `/` | Crear representante |
| PUT | `/:id` | Actualizar |
| DELETE | `/:id` | Eliminar |
| POST | `/:id/donor-spokesperson` | Designar vocero |

### Emergencia (`/api/v1/emergency`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/access` | Iniciar acceso (QR) |
| GET | `/verify/:token` | Verificar token |
| GET | `/history` | Historial de accesos |

## 🔒 Seguridad

### Encriptación de Datos

Los siguientes campos se encriptan con AES-256-GCM antes de almacenarse:

- Alergias (`allergiesEnc`)
- Condiciones médicas (`conditionsEnc`)
- Medicamentos (`medicationsEnc`)
- Preferencias de donación (`donorPreferencesEnc`)

### Autenticación

- Access tokens: 15 minutos de validez
- Refresh tokens: 7 días de validez
- Rotación de tokens en cada refresh
- Tracking de sesiones con IP y User-Agent

### Rate Limiting

- Global: 100 requests / 15 minutos
- Autenticación: 10 intentos / 15 minutos

### Auditoría

Todos los accesos quedan registrados en `AuditLog` con:
- Usuario/Actor
- Acción realizada
- Recurso accedido
- IP y User-Agent
- Timestamp

## 🗺️ Roadmap

### Fase 1 - MVP (Actual)
- [x] Registro y autenticación
- [x] Perfil del paciente con encriptación
- [x] Gestión de directivas
- [x] Representantes
- [x] QR y acceso de emergencia
- [x] Frontend React

### Fase 2 - Validación Legal
- [ ] Testigos digitales con validación INE
- [ ] Integración con PSC para NOM-151
- [ ] Video-validación de voluntades
- [ ] Firma electrónica avanzada

### Fase 3 - PAE Completo
- [ ] OAuth 2.0 para instituciones médicas
- [ ] Integración CLUES
- [ ] Notificaciones SMS/Push en tiempo real
- [ ] App móvil nativa (React Native)

### Fase 4 - Integración Nacional
- [ ] Conexión con CENATRA
- [ ] Interoperabilidad con RENAPO
- [ ] Portal de administración para notarías
- [ ] Dashboard de estadísticas

## 📄 Licencia

Propietario - Todos los derechos reservados

## 👥 Equipo

Para contribuir al proyecto, contactar al equipo de desarrollo.

---

**Sistema VIDA** - Protegiendo tus decisiones médicas
