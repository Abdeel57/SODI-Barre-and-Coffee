import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: AppError | ZodError | Prisma.PrismaClientKnownRequestError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isDev = process.env.NODE_ENV === 'development'

  // Errores de validación Zod → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  // Errores conocidos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un registro con esos datos' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro no encontrado' })
      return
    }
    res.status(500).json({ error: 'Error de base de datos' })
    return
  }

  // Errores con statusCode custom
  const appErr = err as AppError
  if (appErr.statusCode) {
    res.status(appErr.statusCode).json({
      error: appErr.message,
      ...(isDev && { stack: appErr.stack }),
    })
    return
  }

  // Error genérico → 500
  console.error('❌ Unhandled error:', err)
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { stack: appErr.stack }),
  })
}

export function createError(statusCode: number, message: string): AppError {
  const err = new Error(message) as AppError
  err.statusCode = statusCode
  return err
}
