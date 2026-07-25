import { useState, FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { authApi } from '../api'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { User } from '../types'

/** Solo rutas internas — evita redirigir a un dominio externo con ?next= */
function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'))
  const setAuth = useStore((s) => s.setAuth)
  const showToast = useStore((s) => s.showToast)

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await authApi.login({ email: identifier.trim(), password })
      const { user, accessToken } = res.data as { user: User; accessToken: string }
      setAuth(user, accessToken)
      const home = user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'COACH' ? '/coach/dashboard' : '/schedule'
      // Si venía de un QR/enlace (?next=), regresa ahí
      navigate(next ?? home, { replace: true })
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      const message = error.response?.data?.error ?? 'Error al iniciar sesión'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center px-6 page-enter">
      {/* Background subtle pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,130,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-xs flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img
            src="/LOGOSODI.png"
            alt="SODI Barre & Coffee"
            className="w-56 h-auto"
            style={{ animation: 'logoFloat 6s ease-in-out 0.3s infinite' }}
          />
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-px bg-nude" />
          </div>
        </div>

        {/* Form card */}
        <div className="liquid-glass-strong w-full rounded-2xl px-6 py-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Correo o teléfono"
              type="text"
              inputMode="email"
              placeholder="tu@correo.com o 664 123 4567"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-1"
            >
              Ingresar
            </Button>
          </form>

          {/* Register link */}
          <p className="text-label text-stone text-center mt-5">
            ¿No tienes cuenta?{' '}
            <Link
              to={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
              className="text-nude-dark hover:text-noir transition-colors underline underline-offset-2"
            >
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
