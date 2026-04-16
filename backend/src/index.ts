import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth'
import classRoutes from './routes/classes'
import bookingRoutes from './routes/bookings'
import packageRoutes from './routes/packages'
import paymentRoutes from './routes/payments'
import pushRoutes from './routes/push'
import adminRoutes from './routes/admin'
import { errorHandler } from './middleware/errorHandler'
import { startScheduler } from './services/scheduler'

const app = express()
const PORT = process.env.PORT ?? 3000
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
)

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json())
app.use(cookieParser())

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/push', pushRoutes)
app.use('/api/admin', adminRoutes)

// ─── Error handler global (debe ir al final) ──────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`🚀 SODI Barre API corriendo en http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/health`)
  startScheduler()
})

export default app
