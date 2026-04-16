import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { authApi } from '../api'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { User } from '../types'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useStore((s) => s.setAuth)
  const showToast = useStore((s) => s.showToast)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (name.trim().length < 2) newErrors['name'] = 'El nombre debe tener al menos 2 caracteres'
    if (!email.includes('@')) newErrors['email'] = 'Email inválido'
    if (password.length < 8) newErrors['password'] = 'Mínimo 8 caracteres'
    if (password !== confirm) newErrors['confirm'] = 'Las contraseñas no coinciden'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await authApi.register({
        name: name.trim(),
        email,
        phone: phone.trim() || undefined,
        password,
      })
      const { user, accessToken } = res.data as { user: User; accessToken: string }
      setAuth(user, accessToken)
      showToast(`¡Bienvenida, ${user.name}!`, 'success')
      navigate('/schedule', { replace: true })
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      const message = error.response?.data?.error ?? 'Error al crear la cuenta'
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center px-6 py-12 page-enter">
      {/* Background */}
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
          <img src="/LOGOSODI.png" alt="SODI Barre & Coffee" className="w-48 h-auto" />
          <div className="w-10 h-px bg-nude" />
          <p className="text-section text-stone text-[11px]">Crear cuenta</p>
        </div>

        {/* Form card */}
        <div className="liquid-glass-strong w-full rounded-2xl px-6 py-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nombre completo"
              type="text"
              placeholder="María González"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors['name']}
              autoComplete="name"
              required
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors['email']}
              autoComplete="email"
              required
            />

            <Input
              label="Teléfono (opcional)"
              type="tel"
              placeholder="664 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors['password']}
              autoComplete="new-password"
              required
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors['confirm']}
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-1"
            >
              Crear cuenta
            </Button>
          </form>

          {/* Login link */}
          <p className="text-label text-stone text-center mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-nude-dark hover:text-noir transition-colors underline underline-offset-2"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
