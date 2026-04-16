# SODI Barre & Coffee — Deploy Guide

Sistema de reservas PWA para estudio de barre. Backend en Railway, frontend en Vercel.

---

## Pre-requisitos

- Cuenta en [Railway](https://railway.app)
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [MercadoPago Developers](https://www.mercadopago.com.mx/developers)
- Node.js 20+ instalado localmente
- Git repo en GitHub

---

## Paso 1 — Generar claves secretas

### JWT secrets (correr dos veces)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Guardar los dos resultados como `JWT_SECRET` y `JWT_REFRESH_SECRET`.

### VAPID keys para Push Notifications
```bash
cd backend
npx web-push generate-vapid-keys
```
Guardar `VAPID_PUBLIC_KEY` (empieza con B...) y `VAPID_PRIVATE_KEY`.

---

## Paso 2 — Deploy del Backend en Railway

1. Ir a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Seleccionar el repo → **Root Directory**: `/backend`
3. Railway detecta el `Dockerfile` automáticamente

4. **Agregar PostgreSQL:**
   New Service → Database → PostgreSQL
   Railway conecta `DATABASE_URL` automáticamente al servicio backend

5. En el servicio backend → **Variables**, agregar:
   ```
   JWT_SECRET=<generado en paso 1>
   JWT_REFRESH_SECRET=<generado en paso 1>
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   FRONTEND_URL=https://tu-app.vercel.app  ← actualizar después del paso 4
   BACKEND_URL=https://tu-backend.railway.app
   NODE_ENV=production
   PORT=3000
   MP_ACCESS_TOKEN=<de MercadoPago Developers>
   MP_WEBHOOK_SECRET=<de MercadoPago>
   VAPID_PUBLIC_KEY=<generado en paso 1>
   VAPID_PRIVATE_KEY=<generado en paso 1>
   VAPID_EMAIL=mailto:admin@tudominio.com
   ```

6. **Deploy** → Railway compila la imagen Docker y corre `prisma migrate deploy` automáticamente

7. Ir a **Settings → Networking → Generate Domain**
   Copiar el dominio (ej: `barre-backend.up.railway.app`)

---

## Paso 3 — Generar íconos del frontend

```bash
cd frontend
npm install
npm run generate-icons
```

Verificar que `public/icons/` tiene estos archivos:
- `icon-72.png`, `icon-96.png`, `icon-128.png`, `icon-144.png`
- `icon-152.png`, `icon-180.png`, `icon-192.png`, `icon-384.png`
- `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`

---

## Paso 4 — Deploy del Frontend en Vercel

1. Ir a [vercel.com](https://vercel.com) → **New Project** → **Import Git Repository**
2. Seleccionar el repo → **Root Directory**: `/frontend`
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

6. **Environment Variables**:
   ```
   VITE_API_URL=https://tu-backend.railway.app
   VITE_VAPID_KEY=<VAPID_PUBLIC_KEY del paso 1>
   ```

7. **Deploy** → Vercel genera el dominio (ej: `barre-studio.vercel.app`)

8. Volver a **Railway → backend → Variables**
   Actualizar `FRONTEND_URL=https://barre-studio.vercel.app`
   Railway hace redeploy automático

---

## Paso 5 — Configurar Webhook de MercadoPago

1. Ir a [mercadopago.com.mx/developers](https://www.mercadopago.com.mx/developers) → Tu aplicación
2. **Webhooks → Agregar webhook**:
   - URL: `https://tu-backend.railway.app/api/payments/webhook`
   - Eventos: `payment`
3. Copiar el Webhook Secret → actualizar `MP_WEBHOOK_SECRET` en Railway

---

## Paso 6 — Seed de producción (opcional)

Para cargar datos iniciales (clases, paquetes, admin):

Desde **Railway → backend service → Shell**:
```bash
npm run db:seed
```

O conectarte a la DB directamente:
```bash
railway connect PostgreSQL
```

Credenciales de admin por defecto (si usas el seed):
- **Email**: admin@estudio.com
- **Password**: admin123

> ⚠️ Cambiar la contraseña del admin después del primer login

---

## Paso 7 — Verificar instalación como PWA

1. Abrir la app en **Chrome para Android**
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. Verificar que abre en modo standalone (sin barra del browser)

4. En **Safari para iOS**:
   Compartir (□↑) → "Agregar a pantalla de inicio"

5. Activar notificaciones push desde **Perfil → Notificaciones**
6. Poner el dispositivo en **modo avión** → verificar que el horario carga desde caché

---

## Comandos útiles

```bash
# Desarrollo local
cd backend && npm run dev      # Puerto 3000
cd frontend && npm run dev     # Puerto 5173

# Producción local
cd backend && npm run build && npm start

# Base de datos
cd backend
npm run db:generate   # Regenerar cliente de Prisma
npm run db:migrate    # Aplicar migraciones (producción)
npm run db:seed       # Datos iniciales
npm run db:studio     # GUI de Prisma

# Iconos PWA
cd frontend && npm run generate-icons
```

---

## Estructura del proyecto

```
SODI BARRE/
├── backend/
│   ├── src/
│   │   ├── routes/        # auth, classes, bookings, packages, payments, push, admin
│   │   ├── middleware/    # auth, isAdmin, errorHandler
│   │   ├── services/      # webpush, scheduler
│   │   └── lib/           # prisma singleton
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/         # Login, Register, Schedule, Bookings, Packages, Profile
│   │   ├── pages/admin/   # Dashboard, Classes, Students, Payments
│   │   ├── components/    # ClassCard, WeekCalendar, ClassDetailSheet, ...
│   │   ├── components/ui/ # Button, Badge, BottomSheet, Input, Modal, ...
│   │   ├── components/admin/ # AdminLayout
│   │   ├── hooks/         # useAuth, usePush, useSchedule
│   │   ├── api/           # index.ts, admin.ts
│   │   ├── store/         # useStore (Zustand)
│   │   └── types/         # index.ts, admin.ts
│   ├── public/
│   │   ├── LOGOSODI.png
│   │   └── icons/         # PWA icons (generar con npm run generate-icons)
│   └── .env.example
└── README.md
```

---

## Checklist de verificación final

### Backend
- [ ] `DATABASE_URL` conecta a Railway PostgreSQL
- [ ] `JWT_SECRET` y `JWT_REFRESH_SECRET` son strings únicos de 128+ chars
- [ ] `MP_ACCESS_TOKEN` es válido (modo producción, no sandbox)
- [ ] `MP_WEBHOOK_SECRET` configurado en MP Developers
- [ ] `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` generados con `npx web-push generate-vapid-keys`
- [ ] `FRONTEND_URL` apunta al dominio real de Vercel
- [ ] `NODE_ENV=production`

### Frontend
- [ ] `VITE_API_URL` apunta al dominio real de Railway
- [ ] `VITE_VAPID_KEY` = mismo valor que `VAPID_PUBLIC_KEY` del backend
- [ ] `npm run generate-icons` corrido antes del deploy
- [ ] `public/icons/` tiene los 11 archivos PNG

### Funcionalidad
- [ ] Login de alumna funciona
- [ ] Login de admin funciona y redirige a /admin/dashboard
- [ ] Alumna con role=STUDENT no puede acceder a /admin/*
- [ ] Horario carga clases reales
- [ ] Reserva de clase funciona
- [ ] Cancelación respeta política de 3 horas
- [ ] Paquetes muestran precios correctos
- [ ] Flujo MercadoPago → redirige y regresa con ?status=success
- [ ] Webhook de MP actualiza la subscription automáticamente
- [ ] Notificaciones push llegan al admin al hacer una reserva
- [ ] Recordatorios automáticos activos (verificar logs en Railway)
- [ ] App instalable desde Chrome (Android) y Safari (iOS)
- [ ] Funciona offline — horario y reservas cargan desde caché de Workbox
- [ ] Panel admin: stats del dashboard correctas
- [ ] CRUD de clases funciona (crear, editar, pausar)
- [ ] Búsqueda de alumnas con debounce funciona
- [ ] Historial de pagos visible en admin y en perfil de alumna
