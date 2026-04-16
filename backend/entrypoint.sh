#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SODI Barre & Coffee — Iniciando deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🔄 Ejecutando migraciones de base de datos..."
npx prisma migrate deploy
echo "✅ Migraciones completadas."

echo ""
echo "🌱 Verificando datos iniciales..."
node /app/scripts/seed-prod.js

echo ""
echo "🚀 Iniciando servidor..."
exec node dist/index.js
