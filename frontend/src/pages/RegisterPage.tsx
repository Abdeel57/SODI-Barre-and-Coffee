import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { authApi, profileApi } from '../api'
import { useStore } from '../store/useStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { User } from '../types'
import { clsx } from 'clsx'

// ─── Helpers de estilo reutilizables ─────────────────────────────────────────
const selectClass = clsx(
  'w-full border border-nude-border rounded-sm px-4 py-3',
  'font-body text-[16px] text-noir bg-white',
  'focus:outline-none focus:border-nude transition-colors duration-200',
  'appearance-none',
)

const textareaClass = clsx(
  'w-full border border-nude-border rounded-sm px-4 py-3',
  'font-body text-[16px] text-noir placeholder:text-stone bg-white',
  'focus:outline-none focus:border-nude transition-colors duration-200',
  'resize-none',
)

const labelClass = 'text-label text-stone text-[13px]'
const errorClass = 'text-[11px] text-red-500'

// ─── Subcomponente: toggle salud ──────────────────────────────────────────────
function HealthToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        'flex items-center justify-between w-full px-4 py-3 rounded-sm border transition-colors duration-200',
        checked
          ? 'border-nude bg-nude/10 text-noir'
          : 'border-nude-border bg-white text-stone',
      )}
    >
      <span className="font-body text-[14px] text-left">{label}</span>
      <span
        className={clsx(
          'w-9 h-5 rounded-full flex items-center transition-colors duration-200 shrink-0 ml-3',
          checked ? 'bg-nude justify-end' : 'bg-stone/30 justify-start',
        )}
      >
        <span className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
      </span>
    </button>
  )
}

// ─── Indicador de paso ────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-body transition-colors',
              s === current
                ? 'bg-nude text-white'
                : s < current
                ? 'bg-nude/40 text-white'
                : 'bg-nude-border text-stone',
            )}
          >
            {s}
          </div>
          {s < 2 && <div className={clsx('w-8 h-px', s < current ? 'bg-nude/40' : 'bg-nude-border')} />}
        </div>
      ))}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate  = useNavigate()
  const setAuth   = useStore((s) => s.setAuth)
  const showToast = useStore((s) => s.showToast)

  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  // ── Paso 1: datos personales ──────────────────────────────────────────────
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [gender,    setGender]    = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')

  // ── Paso 2: perfil de salud ───────────────────────────────────────────────
  const [hasSurgeries,    setHasSurgeries]    = useState(false)
  const [surgeriesDetail, setSurgeriesDetail] = useState('')
  const [isPregnant,      setIsPregnant]      = useState(false)
  const [pregnancyWeeks,  setPregnancyWeeks]  = useState('')
  const [bloodType,       setBloodType]       = useState('')
  const [emergencyName,   setEmergencyName]   = useState('')
  const [emergencyPhone,  setEmergencyPhone]  = useState('')
  const [allergies,       setAllergies]       = useState('')
  const [injuries,        setInjuries]        = useState('')

  // ── Validación paso 1 ─────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const e: Record<string, string> = {}
    if (name.trim().length < 2)  e['name']      = 'Mínimo 2 caracteres'
    if (!email.includes('@'))     e['email']     = 'Email inválido'
    if (!gender)                  e['gender']    = 'Selecciona una opción'
    if (!birthDate)               e['birthDate'] = 'La fecha de nacimiento es requerida'
    if (password.length < 8)      e['password']  = 'Mínimo 8 caracteres'
    if (password !== confirm)     e['confirm']   = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit paso 1: registrar usuario ─────────────────────────────────────
  async function handleStep1(e: FormEvent) {
    e.preventDefault()
    if (!validateStep1()) return
    setLoading(true)
    try {
      const res = await authApi.register({
        name:      name.trim(),
        email,
        phone:     phone.trim() || undefined,
        password,
        gender:    gender || undefined,
        birthDate: birthDate || undefined,
      })
      const { user, accessToken } = res.data as { user: User; accessToken: string }
      setAuth(user, accessToken)
      setStep(2)
    } catch (err) {
      const error = err as AxiosError<{ error: string }>
      showToast(error.response?.data?.error ?? 'Error al crear la cuenta', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit paso 2: guardar perfil de salud ────────────────────────────────
  async function handleStep2(skip = false) {
    if (!skip) {
      setLoading(true)
      try {
        await profileApi.updateHealth({
          hasSurgeries,
          surgeriesDetail:       hasSurgeries ? surgeriesDetail.trim() || undefined : undefined,
          isPregnant,
          pregnancyWeeks:        isPregnant && pregnancyWeeks ? parseInt(pregnancyWeeks) : null,
          bloodType:             bloodType || undefined,
          emergencyContactName:  emergencyName.trim()  || undefined,
          emergencyContactPhone: emergencyPhone.trim() || undefined,
          allergies:             allergies.trim()  || undefined,
          injuries:              injuries.trim()   || undefined,
        })
        showToast('¡Perfil completado! Bienvenida.', 'success')
      } catch {
        showToast('¡Bienvenida! Puedes completar tu perfil de salud más tarde.', 'success')
      } finally {
        setLoading(false)
      }
    } else {
      showToast('¡Bienvenida!', 'success')
    }
    navigate('/schedule', { replace: true })
  }

  // ── Fondo decorativo ──────────────────────────────────────────────────────
  const bg = (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,130,0.15) 0%, transparent 70%)',
      }}
    />
  )

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 1 — Información personal
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-off-white flex flex-col items-center justify-center px-6 py-12 page-enter">
        {bg}
        <div className="relative w-full max-w-xs flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src="/LOGOSODI.png" alt="SODI Barre & Coffee" className="w-44 h-auto" />
            <div className="w-10 h-px bg-nude" />
            <p className="text-section text-stone text-[11px]">Crear cuenta</p>
          </div>

          <StepIndicator current={1} />

          <div className="liquid-glass-strong w-full rounded-2xl px-6 py-7">
            <p className="text-label text-stone text-[11px] text-center mb-4">
              Paso 1 de 2 — Información personal
            </p>

            <form onSubmit={handleStep1} className="flex flex-col gap-4">
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

              {/* Género */}
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Género</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={clsx(selectClass, !gender && 'text-stone')}
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="FEMALE">Femenino</option>
                  <option value="MALE">Masculino</option>
                  <option value="OTHER">Otro</option>
                  <option value="PREFER_NOT_TO_SAY">Prefiero no decir</option>
                </select>
                {errors['gender'] && <p className={errorClass}>{errors['gender']}</p>}
              </div>

              {/* Fecha de nacimiento */}
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Fecha de nacimiento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={clsx(selectClass, !birthDate && 'text-stone')}
                />
                {errors['birthDate']
                  ? <p className={errorClass}>{errors['birthDate']}</p>
                  : <p className={clsx(errorClass, 'text-stone/60')}>Debes tener mínimo 16 años</p>
                }
              </div>

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
                Siguiente →
              </Button>
            </form>

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

  // ─────────────────────────────────────────────────────────────────────────
  // PASO 2 — Perfil de salud
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-start px-6 py-10 page-enter">
      {bg}
      <div className="relative w-full max-w-xs flex flex-col items-center gap-6 pb-10">
        {/* Logo pequeño */}
        <img src="/LOGOSODI.png" alt="SODI" className="w-28 h-auto" />

        <StepIndicator current={2} />

        <div className="liquid-glass-strong w-full rounded-2xl px-6 py-7">
          <p className="text-label text-stone text-[11px] text-center mb-1">
            Paso 2 de 2 — Perfil de salud
          </p>
          <p className="font-body text-[12px] text-stone text-center mb-5 leading-relaxed">
            Esta información es confidencial y nos ayuda a brindarte una clase segura.
            Puedes omitirla y completarla después desde tu perfil.
          </p>

          <div className="flex flex-col gap-4">

            {/* Cirugías */}
            <HealthToggle
              label="¿Has tenido alguna cirugía?"
              checked={hasSurgeries}
              onChange={setHasSurgeries}
            />
            {hasSurgeries && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Describe tus cirugías (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ej: rodilla derecha, 2022..."
                  value={surgeriesDetail}
                  onChange={(e) => setSurgeriesDetail(e.target.value)}
                  className={textareaClass}
                />
              </div>
            )}

            {/* Embarazo */}
            <HealthToggle
              label="¿Estás embarazada?"
              checked={isPregnant}
              onChange={setIsPregnant}
            />
            {isPregnant && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>¿Cuántas semanas de gestación?</label>
                <input
                  type="number"
                  min={1}
                  max={42}
                  placeholder="Ej: 12"
                  value={pregnancyWeeks}
                  onChange={(e) => setPregnancyWeeks(e.target.value)}
                  className={selectClass}
                />
              </div>
            )}

            {/* Tipo de sangre */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Tipo de sangre (opcional)</label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className={clsx(selectClass, !bloodType && 'text-stone')}
              >
                <option value="">No sé / Prefiero no decir</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Contacto de emergencia */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contacto de emergencia — Nombre</label>
              <input
                type="text"
                placeholder="Ej: Juan González"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className={selectClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contacto de emergencia — Teléfono</label>
              <input
                type="tel"
                placeholder="664 123 4567"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className={selectClass}
              />
            </div>

            {/* Alergias */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Alergias (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: látex, mariscos, medicamentos..."
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className={textareaClass}
              />
            </div>

            {/* Lesiones */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Lesiones o condiciones físicas (opcional)</label>
              <textarea
                rows={2}
                placeholder="Ej: lumbalgia, escoliosis, lesión de hombro..."
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                className={textareaClass}
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={loading}
              onClick={() => handleStep2(false)}
              className="w-full mt-2"
            >
              Finalizar registro
            </Button>

            <button
              type="button"
              onClick={() => handleStep2(true)}
              className="text-stone text-[13px] text-center underline underline-offset-2 hover:text-noir transition-colors"
            >
              Omitir por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
