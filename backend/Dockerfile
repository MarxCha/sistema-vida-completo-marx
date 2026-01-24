# Backend Dockerfile optimizado para producción
FROM node:20-alpine AS builder

# Instalar dependencias del sistema para Prisma y compilación
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Evitar descarga de chromium durante npm ci
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Crear directorio de trabajo
WORKDIR /app

# Copiar solo archivos de configuración para cachear dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias (incluyendo devDependencies para Prisma CLI)
RUN npm ci --quiet --no-audit --no-fund --no-progress

# Copiar código fuente
COPY . .

# Generar cliente Prisma y compilar
RUN npx prisma generate && npm run build

# Eliminar dependencias de desarrollo para reducir tamaño
RUN npm prune --production --quiet --no-audit --no-fund --no-progress

# Stage de producción más ligero
FROM node:20-alpine AS runner

# Instalar dependencias necesarias para runtime y Puppeteer (Chromium)
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    libstdc++ \
    fontconfig \
    dbus \
    gcompat

# Configurar variables de entorno para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Crear directorio de trabajo
WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copiar archivos necesarios del builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Crear directorio de uploads y cache con permisos para nodejs
RUN mkdir -p /app/uploads/documents /app/uploads/profiles /app/uploads/temp /app/.cache/puppeteer && \
    chown -R nodejs:nodejs /app/uploads /app/.cache/puppeteer

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3001
ENV PORT 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar
CMD ["node", "dist/main.js"]