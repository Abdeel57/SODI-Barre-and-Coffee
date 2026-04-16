import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface TokenPayload {
  id: string
  email: string
  role: 'STUDENT' | 'ADMIN'
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
