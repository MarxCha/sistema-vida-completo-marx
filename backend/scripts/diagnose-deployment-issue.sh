#!/bin/bash

echo "🔍 DIAGNÓSTICO DEL PROBLEMA DE DEPLOYMENT"
echo "=========================================="

# Verificar el estado actual del deployment
echo "📍 Ubicación actual:"
pwd

echo ""
echo "🔍 Verificando permisos y estado del directorio..."
ls -la

echo ""
echo "🐋 Verificando archivos clave..."
ls -la Dockerfile* docker-compose* package.json

echo ""
echo "🔍 Verificando variables de entorno críticas..."
echo "NODE_ENV: ${NODE_ENV:-'no definida'}"
echo "DATABASE_URL: ${DATABASE_URL:0:20}"

echo ""
echo "🔍 Verificar espacio en disco..."
df -h . | head -5

echo ""
echo "🔍 Verificando Docker daemon status..."
docker --version 2>/dev/null || echo "❌ Docker no disponible"

echo ""
echo "🔍 Verificando Docker Compose si existe..."
if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml encontrado"
    docker-compose ps 2>/dev/null || echo "❌ No hay contenedores activos"
else
    echo "❌ No se encontró docker-compose.yml"
fi

echo ""
echo "🔍 Verificación de logs del build anterior..."
echo "Últimas 20 líneas de logs del build:"
echo "----------------------------------------"
tail -20 deployment.log 2>/dev/null || echo "No hay deployment.log"

echo ""
echo "💡 POSIBLES SOLUCIONES:"
echo "├── Eliminar contenedores antiguos: docker system prune -f"
echo "├── Reconstruir imagen sin caché: docker build --no-cache"
echo "├── Verificar que haya espacio disponible en disco"
echo "├── Verificar configuración de Coolify"
echo "├── Revisar variables de entorno"
echo ""
echo "📋 Para ejecutar manualmente:"
echo "docker-compose up --build --force-recreate"