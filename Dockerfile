# ── Stage 1: Build frontend ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

# VITE_ variables son incrustadas en el bundle en tiempo de build
# Railway las pasa automáticamente como build args
ARG VITE_VAPID_KEY
ENV VITE_VAPID_KEY=$VITE_VAPID_KEY

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ─────────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app

# OpenSSL requerido por Prisma en Alpine
RUN apk add --no-cache openssl

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci

# Genera el cliente Prisma con los binarios para Alpine (linux-musl)
RUN npx prisma generate

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ── Stage 3: Production runner ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# OpenSSL requerido por Prisma en runtime
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Runtime del backend
COPY --from=backend-builder /app/dist          ./dist
COPY --from=backend-builder /app/node_modules  ./node_modules
COPY --from=backend-builder /app/prisma        ./prisma
COPY --from=backend-builder /app/package.json  ./

# Frontend estático servido por Express
COPY --from=frontend-builder /frontend/dist    ./dist/public

# Script de seed de producción (JS puro, no necesita ts-node)
COPY backend/scripts/seed-prod.js ./scripts/seed-prod.js

# Entrypoint: migraciones → seed → servidor
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
