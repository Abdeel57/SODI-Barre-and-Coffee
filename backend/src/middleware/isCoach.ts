import { Request, Response, NextFunction } from 'express'
import { createError } from './errorHandler'

export function isCoach(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === 'COACH' || req.user?.role === 'ADMIN') return next()
  return next(createError(403, 'Acceso reservado para coaches'))
}
