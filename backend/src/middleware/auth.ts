import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface TokenPayload {
  id: string
  email: string
  role: 'STUDENT' | 'ADMIN' | 'COACH'
  iat?: number
  exp?: number
}

export function auth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de acceso requerido' })
    return
  }

  const token = authHeader.split(' ')[1]
  const secret = process.env.JWT_SECRET

  if (!secret) {
    res.status(500).json({ error: 'Configuración de servidor incorrecta' })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload
    req.user = { id: payload.id, email: payload.email, role: payload.role }
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

/**
 * Adjunta `req.user` si viene un token válido, pero nunca bloquea.
 * Para endpoints públicos que muestran algo distinto con sesión iniciada.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const secret = process.env.JWT_SECRET

  if (authHeader?.startsWith('Bearer ') && secret) {
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], secret) as TokenPayload
      req.user = { id: payload.id, email: payload.email, role: payload.role }
    } catch {
      // token inválido → se trata como anónimo
    }
  }

  next()
}
