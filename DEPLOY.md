# SODI Barre & Coffee — Guía de Deploy

> Todas las claves ya están generadas. Solo copia y pega.

---

## Cuentas que necesitas crear ANTES de empezar

| Servicio | URL | Para qué |
|----------|-----|----------|
| GitHub | github.com | Subir el código |
| Railway | railway.app | Hospedar el backend + base de datos |
| Vercel | vercel.com | Hospedar el frontend |
| MercadoPago Developers | mercadopago.com.mx/developers | Pagos en línea |

Crea las cuentas gratis antes de continuar.

---

## PASO 1 — Subir el código a GitHub

### 1.1 Crear repositorio en GitHub
1. Ir a github.com → botón verde **"New"**
2. Nombre del repo: `sodi-barre`
3. Visibilidad: **Private** (recomendado)
4. **NO** marcar "Add a README file"
5. Click **"Create repository"**

### 1.2 Subir el código desde tu computadora
Abrir una terminal en la carpeta **SODI BARRE** y correr estos comandos uno por uno:

```bash
git init
git add .
git commit -m "Initial commit — SODI Barre PWA"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/sodi-barre.git
git push -u origin main
```

> Reemplaza `TU-USUARIO` con tu nombre de usuario de GitHub.

---

## PASO 2 — Deploy del Backend en Railway

### 2.1 Crear el proyecto en Railway
1. Ir a **railway.app** → Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Conectar tu cuenta de GitHub si te lo pide
4. Buscar y seleccionar el repo `sodi-barre`
5. En **Root Directory** escribir: `/backend`
6. Click **"Deploy Now"**

### 2.2 Agregar la base de datos PostgreSQL
1. En tu proyecto de Railway, click **"+ New"**
2. Click **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway conecta la base de datos automáticamente ✓

### 2.3 Pegar las variables de entorno
1. Click en el servicio de tu **backend** (no en PostgreSQL)
2. Ir a la pestaña **"Variables"**
3. Click **"Raw Editor"** (esquina superior derecha del panel de variables)
4. Borrar todo lo que haya y pegar esto completo:

```
DATABASE_URL=postgresql://postgres:cxJOOPwepwZXgMRrbvrNZcuMICRjKRYQ@interchange.proxy.rlwy.net:36411/railway
JWT_SECRET=d717c96151ca1c20e6cbb7d816eba0d4d3e8d437658d7c2afd40dab1b0e60a5c21f9bb71c03ad2a27a3e80256ecc068605bfb53f7b232dec881ac1d893c19670
JWT_REFRESH_SECRET=749ffcecb9498b9429a72ee71f3cb110ad18fd14b110a756466ddd97e17d6edaa73075c4f0e8d511fc852c3b521e0069c3e770a2f4ed0e09ed8fea103d8f5b21
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
VAPID_PUBLIC_KEY=BEUtyrLdfaO2sQeVAQgCtBmHeEXCWEMfuHGrtUrrclHO7b_y8t3lKeq8zLv-iKtaGk83p0w7aqiXHrdhRSUNj9Q
VAPID_PRIVATE_KEY=xEMHDnMbym3PW2PUYI2toBd_sXhPx0y7ImOszngqHFc
VAPID_EMAIL=mailto:admin@sodibarre.com
MP_ACCESS_TOKEN=AQUI_VA_TU_TOKEN_DE_MERCADOPAGO
BACKEND_URL=AQUI_VA_TU_DOMINIO_DE_RAILWAY
FRONTEND_URL=AQUI_VA_TU_DOMINIO_DE_VERCEL
```

5. Click **"Update Variables"**

> ⚠️ Las últimas 3 líneas las actualizarás después.
> Por ahora déjalas con el texto placeholder — el deploy inicial
> funcionará igual para la base de datos y el servidor.

### 2.4 Obtener el dominio de Railway
1. Click en el servicio del backend
2. Ir a la pestaña **"Settings"**
3. Buscar la sección **"Networking"**
4. Click **"Generate Domain"**
5. Te dará un dominio como: `sodi-barre-backend.up.railway.app`

**Copia ese dominio — lo necesitas en el Paso 3 y 4.**

### 2.5 Verificar que el backend funciona
Abre en tu navegador:
```
https://TU-DOMINIO-RAILWAY.up.railway.app/health
```
Debe mostrar: `{"status":"ok","timestamp":"..."}`

Si lo ves, el backend está funcionando ✓

---

## PASO 3 — Deploy del Frontend en Vercel

### 3.1 Crear el proyecto en Vercel
1. Ir a **vercel.com** → Click **"Add New Project"**
2. Click **"Import Git Repository"**
3. Conectar tu cuenta de GitHub si te lo pide
4. Buscar el repo `sodi-barre` y click **"Import"**

### 3.2 Configurar el proyecto
En la pantalla de configuración:

| Campo | Valor |
|-------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3.3 Pegar las variables de entorno
Justo debajo de la configuración hay una sección **"Environment Variables"**.
Agregar estas dos variables una por una:

**Variable 1:**
- Name: `VITE_API_URL`
- Value:
```
https://TU-DOMINIO-RAILWAY.up.railway.app
```
*(pegar el dominio que copiaste en el paso 2.4)*

**Variable 2:**
- Name: `VITE_VAPID_KEY`
- Value:
```
BEUtyrLdfaO2sQeVAQgCtBmHeEXCWEMfuHGrtUrrclHO7b_y8t3lKeq8zLv-iKtaGk83p0w7aqiXHrdhRSUNj9Q
```

### 3.4 Hacer el deploy
Click **"Deploy"**. Vercel construirá la app en ~2 minutos.

### 3.5 Obtener el dominio de Vercel
Al terminar, Vercel muestra el dominio. Será algo como:
`sodi-barre.vercel.app`

**Copia ese dominio — lo necesitas en el siguiente paso.**

---

## PASO 4 — Conectar Backend y Frontend

Ahora que tienes ambos dominios, actualiza las variables en Railway:

1. Volver a **railway.app** → tu proyecto → servicio backend → **Variables**
2. Buscar y editar estas dos variables:

**BACKEND_URL** → reemplazar con:
```
https://TU-DOMINIO-RAILWAY.up.railway.app
```

**FRONTEND_URL** → reemplazar con:
```
https://TU-DOMINIO-VERCEL.vercel.app
```

3. Click **"Update Variables"**
4. Railway hace un redeploy automático en ~1 minuto

---

## PASO 5 — Obtener el Token de MercadoPago

### 5.1 Crear aplicación en MercadoPago
1. Ir a **mercadopago.com.mx/developers**
2. Iniciar sesión con tu cuenta de MercadoPago
3. Click **"Crear aplicación"**
4. Nombre: `SODI Barre`
5. Tipo: `Pagos online`
6. Click **"Crear"**

### 5.2 Obtener el Access Token
1. En tu aplicación → pestaña **"Credenciales de producción"**
2. Copiar el **Access Token** (empieza con `APP_USR-...`)

### 5.3 Actualizar la variable en Railway
1. Railway → backend → Variables
2. Buscar `MP_ACCESS_TOKEN`
3. Reemplazar `AQUI_VA_TU_TOKEN_DE_MERCADOPAGO` con tu token real
4. Click **"Update Variables"**

### 5.4 Configurar el Webhook (para que los pagos se activen automáticamente)
1. En MercadoPago Developers → tu aplicación → **"Webhooks"**
2. Click **"Agregar webhook"**
3. URL del webhook:
```
https://TU-DOMINIO-RAILWAY.up.railway.app/api/payments/webhook
```
4. Eventos: marcar **"Pagos"**
5. Click **"Guardar"**

---

## PASO 6 — Verificación final

Abrir la app en el navegador con el dominio de Vercel y verificar:

### Como alumna
- [ ] Entrar a `https://tu-app.vercel.app`
- [ ] Crear cuenta nueva o usar: `alumna@test.com` / `alumna123`
- [ ] Ver el horario con clases
- [ ] Reservar una clase
- [ ] Ver la reserva en "Mis Reservas"
- [ ] Ver los paquetes disponibles con precios

### Como admin
- [ ] Iniciar sesión con: `admin@estudio.com` / `admin123`
- [ ] Ver el dashboard con estadísticas
- [ ] Ver la lista de clases
- [ ] Ver la lista de alumnas
- [ ] Ver el historial de pagos

### Instalar como app en el celular
**Android (Chrome):**
1. Abrir la app en Chrome
2. Menú (⋮) → "Agregar a pantalla de inicio"
3. Confirmar → la app aparece como ícono en el escritorio

**iPhone (Safari):**
1. Abrir la app en Safari
2. Botón compartir (□↑) → "Agregar a pantalla de inicio"
3. Confirmar → la app aparece como ícono en el escritorio

---

## Credenciales de acceso de la app

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Admin | admin@estudio.com | admin123 | Administrador |
| Alumna de prueba | alumna@test.com | alumna123 | Estudiante |

> ⚠️ Cambiar estas contraseñas después del primer login

---

## Resumen de dominios (llenar después del deploy)

| Servicio | Dominio |
|----------|---------|
| Backend (Railway) | `https://________________.up.railway.app` |
| Frontend (Vercel) | `https://________________.vercel.app` |

---

## Si algo falla

**El backend no responde:**
- Railway → tu proyecto → ver los **Logs** del servicio
- Buscar mensajes de error en rojo

**El frontend no carga datos:**
- Abrir DevTools en Chrome (F12) → pestaña **Console**
- Si hay errores de CORS, verificar que `FRONTEND_URL` en Railway tiene el dominio exacto de Vercel

**Los pagos no se procesan:**
- Verificar que `MP_ACCESS_TOKEN` es de producción (no sandbox)
- Verificar que el webhook está configurado con la URL correcta

**Soporte Railway:** railway.app/help
**Soporte Vercel:** vercel.com/help
