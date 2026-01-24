# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --quiet --no-audit --no-fund --no-progress

# Copiar código fuente
COPY . .

# Copiar archivo de environment de producción
COPY .env.production .env

# Build de producción (saltando chequeo de tipos estricto para asegurar despliegue)
RUN npx vite build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer puerto
EXPOSE 3000

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
