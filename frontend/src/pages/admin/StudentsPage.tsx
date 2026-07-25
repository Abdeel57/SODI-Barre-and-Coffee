import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, ChevronDown, ChevronUp, Trash2, KeyRound, Eye, EyeOff, Gift,
  UserPlus, MessageCircle, Copy, Check,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { TierBadge } from '../../components/TierBadge'
import type { TierId } from '../../types'
import type { AdminStudent, DeleteBlockedError } from '../../types/admin'

// ─── Role badge helpers ───────────────────────────────────────────────────────
type DisplayRole = 'STUDENT' | 'COACH'

interface RoleToggleProps {
  studentId: string
  currentRole: DisplayRole
  onChanged: () => void
}

function RoleToggle({ studentId, currentRole, onChanged }: RoleToggleProps) {
  const showToast = useStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    const next: DisplayRole = currentRole === 'STUDENT' ? 'COACH' : 'STUDENT'
    setLoading(true)
    try {
      await adminApi.setUserRole(studentId, next)
      showToast(next === 'COACH' ? 'Rol actualizado a Coach' : 'Rol actualizado a Estudiante', 'success')
      onChanged()
    } catch {
      showToast('Error al cambiar el rol', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
        currentRole === 'COACH'
          ? 'bg-nude-light text-nude-dark border-nude'
          : 'bg-white text-stone border-nude-border hover:border-nude'
      }`}
    >
      {loading ? '...' : currentRole === 'COACH' ? 'Coach' : 'Alumna'}
    </button>
  )
}

// ─── Confirm Delete Sheet ─────────────────────────────────────────────────────

function ConfirmDeleteSheet({
  student,
  onClose,
  onDeleted,
}: {
  student: AdminStudent
  onClose: () => void
  onDeleted: () => void
}) {
  const showToast = useStore((s) => s.showToast)
  const [loading, setLoading]     = useState(false)
  const [blocked, setBlocked]     = useState<DeleteBlockedError | null>(null)

  async function handleDelete() {
    setLoading(true)
    try {
      await adminApi.deleteStudent(student.id)
      showToast(`${student.name} eliminada`, 'success')
      onDeleted()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: DeleteBlockedError } })?.response?.data
      if (data?.reason === 'HAS_PAYMENTS') {
        setBlocked(data)
      } else {
        showToast('Error al eliminar la alumna', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Eliminar alumna">
      {blocked ? (
        <div className="flex flex-col gap-4">
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-label text-noir font-medium mb-1">No se puede eliminar</p>
            <p className="text-stone text-[13px]">
              {student.name} tiene <strong>{blocked.paymentCount}</strong>{' '}
              {blocked.paymentCount === 1 ? 'pago registrado' : 'pagos registrados'} en el sistema.
              Para eliminar la cuenta, primero elimina los pagos manualmente desde la base de datos.
            </p>
          </div>
          <Button variant="ghost" size="lg" onClick={onClose} className="w-full">
            Entendido
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-label text-noir font-medium mb-1">¿Eliminar a {student.name}?</p>
            <p className="text-stone text-[13px]">
              Se eliminarán todas sus reservas y suscripción. Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 py-3 rounded-sm bg-red-600 text-white text-label font-medium disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

// ─── Password Reset Sheet ─────────────────────────────────────────────────────

function PasswordResetSheet({
  student,
  onClose,
}: {
  student: AdminStudent
  onClose: () => void
}) {
  const showToast   = useStore((s) => s.showToast)
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setLoading(true)
    try {
      await adminApi.resetStudentPassword(student.id, password)
      showToast('Contraseña actualizada', 'success')
      onClose()
    } catch {
      showToast('Error al cambiar la contraseña', 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-nude-border rounded-sm px-4 py-3 text-label text-noir bg-white focus:outline-none focus:border-nude'

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={`Cambiar contraseña — ${student.name.split(' ')[0]}`}>
      <div className="flex flex-col gap-4">
        <p className="text-stone text-[13px]">
          Establece una nueva contraseña para esta alumna. Compártela con ella de forma segura.
        </p>

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={inputCls + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirmar contraseña */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Confirmar contraseña</label>
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className={inputCls}
          />
        </div>

        {error && (
          <p className="text-red-500 text-[12px]">{error}</p>
        )}

        <Button variant="primary" size="lg" loading={loading} onClick={handleSave} className="w-full">
          Guardar contraseña
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── Registrar alumna ─────────────────────────────────────────────────────────
// Alta desde el mostrador: muchas alumnas no se registran solas. El correo es
// opcional — si no lo tiene, entra a la app con su teléfono.

const LADA_PAIS = '52' // México

interface NewStudentForm {
  name:      string
  phone:     string
  email:     string
  password:  string
  gender:    string
  birthDate: string
}

interface CreatedStudent {
  name:     string
  phone:    string
  email:    string
  password: string
  /** false = le generamos un correo interno, entra con su teléfono */
  hasOwnEmail: boolean
}

function loginIdOf(s: CreatedStudent) {
  return s.hasOwnEmail ? s.email : s.phone
}

function welcomeMessage(s: CreatedStudent) {
  const firstName = s.name.trim().split(' ')[0]
  return [
    `¡Hola ${firstName}! Ya te registré en SODI Barre & Coffee 🩰`,
    '',
    `Entra aquí: ${window.location.origin}/login`,
    `Usuario: ${loginIdOf(s)}`,
    `Contraseña: ${s.password}`,
    '',
    'Ahí puedes ver los horarios y apartar tu clase. ¡Nos vemos!',
  ].join('\n')
}

const EMPTY_FORM: NewStudentForm = {
  name: '', phone: '', email: '', password: '', gender: '', birthDate: '',
}

function NewStudentSheet({ onClose }: { onClose: (didCreate: boolean) => void }) {
  const showToast = useStore((s) => s.showToast)

  const [form,       setForm]       = useState<NewStudentForm>(EMPTY_FORM)
  const [errors,     setErrors]     = useState<Partial<Record<keyof NewStudentForm, string>>>({})
  const [showPwd,    setShowPwd]    = useState(false)
  const [pwdTouched, setPwdTouched] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [created,    setCreated]    = useState<CreatedStudent | null>(null)
  const [copied,     setCopied]     = useState(false)
  const createdAny = useRef(false)

  function set(key: keyof NewStudentForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  // Solo dígitos; si pegan el número con lada de país nos quedamos con los últimos 10
  function setPhone(raw: string) {
    const digits = raw.replace(/\D/g, '')
    const phone = digits.length > 10 ? digits.slice(-10) : digits
    setForm((f) => ({ ...f, phone, ...(pwdTouched ? {} : { password: phone }) }))
    setErrors((e) => ({ ...e, phone: undefined, password: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof NewStudentForm, string>> = {}
    if (form.name.trim().length < 2)                              errs.name     = 'Escribe su nombre completo'
    if (form.phone.length !== 10)                                 errs.phone    = 'Deben ser 10 dígitos'
    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email))    errs.email    = 'Correo inválido'
    if (form.password.length < 8)                                 errs.password = 'Mínimo 8 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await adminApi.createStudent({
        name:     form.name.trim(),
        phone:    form.phone,
        password: form.password,
        ...(form.email.trim() && { email: form.email.trim() }),
        ...(form.gender       && { gender: form.gender }),
        ...(form.birthDate    && { birthDate: form.birthDate }),
      })
      const data = res.data as { email: string; hasOwnEmail: boolean }
      createdAny.current = true
      setCreated({
        name:        form.name.trim(),
        phone:       form.phone,
        email:       data.email,
        password:    form.password,
        hasOwnEmail: data.hasOwnEmail,
      })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      showToast(msg ?? 'Error al registrar la alumna', 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleWhatsApp() {
    if (!created) return
    const url = `https://wa.me/${LADA_PAIS}${created.phone}?text=${encodeURIComponent(welcomeMessage(created))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleCopy() {
    if (!created) return
    try {
      await navigator.clipboard.writeText(welcomeMessage(created))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('No se pudieron copiar los datos', 'error')
    }
  }

  function registerAnother() {
    setForm(EMPTY_FORM)
    setErrors({})
    setPwdTouched(false)
    setCreated(null)
  }

  const inputCls = 'w-full border border-nude-border rounded-sm px-4 py-3 text-[16px] text-noir bg-white focus:outline-none focus:border-nude placeholder:text-stone'
  const errorCls = 'text-red-500 text-[11px] mt-0.5'
  const hintCls  = 'text-stone/70 text-[11px] mt-0.5'

  // ── Listo: entregar los datos a la alumna ─────────────────────────────────
  if (created) {
    return (
      <BottomSheet isOpen={true} onClose={() => onClose(true)} title="Alumna registrada">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-nude/10 border border-nude-border rounded-md">
            <div className="w-9 h-9 rounded-full bg-noir flex items-center justify-center shrink-0">
              <Check size={16} className="text-white" />
            </div>
            <p className="text-label text-noir">
              {created.name.split(' ')[0]} ya puede entrar a la app
            </p>
          </div>

          <div className="flex flex-col gap-2 px-4 py-3 border border-nude-border rounded-md">
            <div>
              <p className="text-stone text-xs">Usuario</p>
              <p className="text-label text-noir break-all">{loginIdOf(created)}</p>
            </div>
            <div>
              <p className="text-stone text-xs">Contraseña</p>
              <p className="text-label text-noir">{created.password}</p>
            </div>
            {created.hasOwnEmail && (
              <p className={hintCls}>
                También puede entrar con su teléfono: {created.phone}
              </p>
            )}
          </div>

          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-sm bg-[#25D366] text-white text-label font-medium transition-opacity active:opacity-80"
          >
            <MessageCircle size={16} />
            Enviarle sus datos por WhatsApp
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-sm border border-nude-border text-noir text-label transition-colors hover:border-nude"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Datos copiados' : 'Copiar datos'}
          </button>

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={registerAnother} className="flex-1">
              Registrar otra
            </Button>
            <Button variant="primary" size="lg" onClick={() => onClose(true)} className="flex-1">
              Listo
            </Button>
          </div>
        </div>
      </BottomSheet>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <BottomSheet isOpen={true} onClose={() => onClose(createdAny.current)} title="Registrar alumna">
      <div className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Nombre completo</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: María González"
            autoComplete="off"
            className={inputCls}
          />
          {errors.name && <p className={errorCls}>{errors.name}</p>}
        </div>

        {/* Teléfono */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Teléfono</label>
          <input
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="6641234567"
            autoComplete="off"
            className={inputCls}
          />
          {errors.phone
            ? <p className={errorCls}>{errors.phone}</p>
            : <p className={hintCls}>10 dígitos. Con este número entra a la app y le mandas sus datos.</p>
          }
        </div>

        {/* Correo — opcional */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Correo (opcional)</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="maria@correo.com"
            autoComplete="off"
            autoCapitalize="none"
            className={inputCls}
          />
          {errors.email
            ? <p className={errorCls}>{errors.email}</p>
            : <p className={hintCls}>Si no tiene o no lo recuerda, déjalo vacío.</p>
          }
        </div>

        {/* Contraseña */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => { setPwdTouched(true); set('password', e.target.value) }}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className={inputCls + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone"
              aria-label={showPwd ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password
            ? <p className={errorCls}>{errors.password}</p>
            : <p className={hintCls}>Se llena sola con su teléfono para que la recuerde. Puedes cambiarla.</p>
          }
        </div>

        {/* Género */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Género (opcional)</label>
          <select
            value={form.gender}
            onChange={(e) => set('gender', e.target.value)}
            className={inputCls + ' appearance-none' + (form.gender ? '' : ' text-stone')}
          >
            <option value="">Sin especificar</option>
            <option value="FEMALE">Femenino</option>
            <option value="MALE">Masculino</option>
            <option value="OTHER">Otro</option>
            <option value="PREFER_NOT_TO_SAY">Prefiere no decir</option>
          </select>
        </div>

        {/* Cumpleaños */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Cumpleaños (opcional)</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={inputCls + ' appearance-none' + (form.birthDate ? '' : ' text-stone')}
          />
          {errors.birthDate
            ? <p className={errorCls}>{errors.birthDate}</p>
            : <p className={hintCls}>Debe tener mínimo 16 años.</p>
          }
        </div>

        <Button variant="primary" size="lg" loading={loading} onClick={handleSave} className="w-full">
          Registrar alumna
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── Assign / Edit Plan Sheet ─────────────────────────────────────────────────

interface PackageOption { id: string; name: string; classCount: number | null; validDays: number }

function AssignPlanSheet({
  student,
  onClose,
  onSaved,
}: {
  student: AdminStudent
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useStore((s) => s.showToast)
  const sub       = student.subscription
  const isNew     = !sub

  const [packages,    setPackages]    = useState<PackageOption[]>([])
  const [packageId,   setPackageId]   = useState(sub ? '' : '')
  const [classesLeft, setClassesLeft] = useState(sub ? String(sub.classesLeft ?? '') : '')
  const [expiresAt,   setExpiresAt]   = useState(sub ? sub.expiresAt.split('T')[0] : '')
  const [isActive,    setIsActive]    = useState(sub ? sub.isActive : true)
  const [loading,     setLoading]     = useState(false)
  const [pkgLoading,  setPkgLoading]  = useState(true)

  // Paquete seleccionado
  const selectedPkg = packages.find((p) => p.id === packageId) ?? null
  const isUnlimited = selectedPkg ? selectedPkg.classCount === null : (sub?.classesLeft === null)

  useEffect(() => {
    adminApi.getPackages()
      .then((r) => {
        const pkgs = r.data.data as PackageOption[]
        setPackages(pkgs)
        // Pre-seleccionar el paquete actual si ya tiene plan
        if (sub) {
          const current = pkgs.find((p) => p.name === sub.packageName)
          if (current) setPackageId(current.id)
        }
      })
      .catch(() => showToast('Error al cargar paquetes', 'error'))
      .finally(() => setPkgLoading(false))
  }, [])

  // Al cambiar paquete, recalcular fechas y clases por defecto
  function handlePackageChange(id: string) {
    setPackageId(id)
    const pkg = packages.find((p) => p.id === id)
    if (!pkg) return
    // clases
    setClassesLeft(pkg.classCount !== null ? String(pkg.classCount) : '')
    // fecha de vencimiento: hoy + validDays
    const exp = new Date()
    exp.setDate(exp.getDate() + pkg.validDays)
    setExpiresAt(exp.toISOString().split('T')[0])
  }

  async function handleSave() {
    if (isNew && !packageId) return showToast('Selecciona un paquete', 'error')
    setLoading(true)
    try {
      const payload: { packageId?: string; classesLeft?: number | null; expiresAt?: string; isActive?: boolean } = {
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }
      if (packageId) payload.packageId = packageId
      if (!isUnlimited && classesLeft !== '') payload.classesLeft = parseInt(classesLeft)
      if (isUnlimited) payload.classesLeft = null

      await adminApi.updateSubscription(student.id, payload)
      showToast(isNew ? 'Plan asignado correctamente' : 'Plan actualizado', 'success')
      onSaved()
    } catch {
      showToast('Error al guardar el plan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fieldCls = 'w-full border border-nude-border rounded-sm px-4 py-3 text-label text-noir bg-white focus:outline-none focus:border-nude appearance-none'

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title={isNew ? `Asignar plan a ${student.name.split(' ')[0]}` : `Plan de ${student.name.split(' ')[0]}`}
    >
      <div className="flex flex-col gap-4">

        {/* Selector de paquete */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Paquete</label>
          {pkgLoading ? (
            <div className="h-12 bg-nude-border/20 rounded-sm animate-pulse" />
          ) : (
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className={fieldCls}
            >
              <option value="">Selecciona un paquete...</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.classCount !== null ? `${p.classCount} clases` : 'Ilimitado'} · {p.validDays} días
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Clases restantes (solo para paquetes con límite) */}
        {!isUnlimited && (
          <Input
            label={isNew ? 'Clases incluidas' : 'Clases restantes'}
            type="number"
            min={0}
            value={classesLeft}
            onChange={(e) => setClassesLeft(e.target.value)}
            placeholder="Ej: 8"
          />
        )}
        {isUnlimited && (
          <div className="px-4 py-3 bg-nude/10 border border-nude-border rounded-sm">
            <p className="text-stone text-[13px]">Clases: <span className="text-noir font-medium">Ilimitadas</span></p>
          </div>
        )}

        {/* Fecha de vencimiento */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Fecha de vencimiento</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={fieldCls}
          />
        </div>

        {/* Plan activo toggle */}
        <div className="flex items-center justify-between py-2">
          <span className="text-label text-stone">Plan activo</span>
          <button
            onClick={() => setIsActive((v) => !v)}
            className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${isActive ? 'bg-noir' : 'bg-nude-border'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        <Button variant="primary" size="lg" loading={loading} onClick={handleSave} className="w-full">
          {isNew ? 'Asignar plan' : 'Guardar cambios'}
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── StudentCard ──────────────────────────────────────────────────────────────

function StudentCard({
  student,
  onAdjust,
  onRoleChanged,
  onDelete,
  onPasswordReset,
  onGiftClass,
}: {
  student: AdminStudent
  onAdjust: (s: AdminStudent) => void
  onRoleChanged: () => void
  onDelete: (s: AdminStudent) => void
  onPasswordReset: (s: AdminStudent) => void
  onGiftClass: (s: AdminStudent) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sub = student.subscription

  const memberSince = (() => {
    try { return format(parseISO(student.createdAt), 'MMM yyyy', { locale: es }) }
    catch { return '' }
  })()

  const expiresLabel = (() => {
    if (!sub) return ''
    try { return format(parseISO(sub.expiresAt.split('T')[0]), "d 'de' MMMM", { locale: es }) }
    catch { return sub.expiresAt }
  })()

  return (
    <div className="bg-white border border-nude-border rounded-md mx-4 mb-2">
      <button
        className="flex items-center gap-3 p-4 w-full tap-target text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-nude-light flex items-center justify-center shrink-0 overflow-hidden">
          {student.avatar
            ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
            : <span className="text-title text-[18px] text-nude-dark font-display">{student.name.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-label font-medium text-noir truncate">{student.name}</p>
            {student.tier && student.tier !== 'none' && (
              <TierBadge tierId={student.tier as TierId} size="sm" />
            )}
          </div>
          <p className="text-stone text-xs truncate">{student.email}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {sub?.isActive ? (
            <span className="text-label text-[9px] bg-noir text-white px-2 py-0.5 rounded-full">
              {sub.classesLeft !== null ? `${sub.classesLeft} clases` : 'Ilimitado'}
            </span>
          ) : (
            <span className="text-stone text-xs">Sin plan</span>
          )}
          {(student.role === 'STUDENT' || student.role === 'COACH') && (
            <RoleToggle
              studentId={student.id}
              currentRole={student.role === 'COACH' ? 'COACH' : 'STUDENT'}
              onChanged={onRoleChanged}
            />
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-stone" />
          ) : (
            <ChevronDown size={14} className="text-stone" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-nude-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-y-2 mb-3">
            <div>
              <p className="text-stone text-xs">Clases tomadas</p>
              <p className="text-label text-noir">{student.totalClassesTaken ?? 0}</p>
            </div>
            <div>
              <p className="text-stone text-xs">Nivel</p>
              <div className="mt-0.5">
                {student.tier && student.tier !== 'none'
                  ? <TierBadge tierId={student.tier as TierId} size="sm" />
                  : <p className="text-stone text-xs">—</p>
                }
              </div>
            </div>
            <div>
              <p className="text-stone text-xs">Total reservas</p>
              <p className="text-label text-noir">{student.totalBookings}</p>
            </div>
            <div>
              <p className="text-stone text-xs">Cortesías</p>
              <p className="text-label text-noir">{student.bonusClasses ?? 0}</p>
            </div>
            <div>
              <p className="text-stone text-xs">Miembro desde</p>
              <p className="text-label text-noir capitalize">{memberSince}</p>
            </div>
            {student.phone && (
              <div className="col-span-2">
                <p className="text-stone text-xs">Teléfono</p>
                <p className="text-label text-noir">{student.phone}</p>
              </div>
            )}
          </div>

          {sub ? (
            <div className="flex flex-col gap-1 mb-3 px-3 py-2 bg-nude/10 rounded-sm border border-nude-border">
              <p className="text-label text-stone text-xs">Plan: <span className="text-noir">{sub.packageName}</span></p>
              <p className="text-label text-stone text-xs">
                Clases:{' '}
                <span className="text-noir">
                  {sub.classesLeft !== null ? `${sub.classesLeft} restantes` : 'Ilimitadas'}
                </span>
              </p>
              <p className="text-label text-stone text-xs">
                Vence:{' '}
                <span className={sub.isActive ? 'text-noir' : 'line-through'}>
                  {expiresLabel}
                </span>
                {!sub.isActive && <span className="text-red-400 ml-1">(inactivo)</span>}
              </p>
            </div>
          ) : (
            <div className="mb-3 px-3 py-2 bg-nude-border/20 rounded-sm">
              <p className="text-stone text-xs">Sin plan activo</p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => onAdjust(student)}>
              {sub ? 'Ajustar plan' : '+ Asignar plan'}
            </Button>
            <button
              onClick={() => onPasswordReset(student)}
              className="flex items-center gap-1.5 text-stone text-[12px] px-3 py-1.5 rounded-sm border border-nude-border hover:border-nude transition-colors"
            >
              <KeyRound size={13} />
              Contraseña
            </button>
            {student.role === 'STUDENT' && (
              <button
                onClick={() => onGiftClass(student)}
                className="flex items-center gap-1.5 text-nude-dark text-[12px] px-3 py-1.5 rounded-sm border border-nude hover:bg-nude-light transition-colors"
              >
                <Gift size={13} />
                Regalar clase
              </button>
            )}
            <button
              onClick={() => onDelete(student)}
              className="flex items-center gap-1.5 text-red-500 text-[12px] px-3 py-1.5 rounded-sm border border-red-200 hover:bg-red-50 transition-colors ml-auto"
            >
              <Trash2 size={13} />
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const showToast = useStore((s) => s.showToast)
  const [students,       setStudents]       = useState<AdminStudent[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [editStudent,    setEditStudent]    = useState<AdminStudent | null>(null)
  const [deleteTarget,   setDeleteTarget]   = useState<AdminStudent | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminStudent | null>(null)
  const [showNewStudent, setShowNewStudent] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const r = await adminApi.getStudents({ search: q || undefined, limit: 50 })
      setStudents(r.data.data as AdminStudent[])
    } catch {
      showToast('Error al cargar alumnas', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchStudents('') }, [fetchStudents])

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchStudents(value), 300)
  }

  async function handleGiftClass(student: AdminStudent) {
    if (!confirm(`¿Regalar una clase de cortesía a ${student.name}?`)) return
    try {
      await adminApi.giftFreeClass(student.id)
      showToast(`Clase de cortesía enviada a ${student.name}`, 'success')
      fetchStudents(search)
    } catch {
      showToast('Error al regalar la clase', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-4 pt-8 pb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-section text-stone text-[11px]">ALUMNAS</p>
          <h1 className="text-hero text-noir mt-0.5">Estudiantes</h1>
        </div>
        <button
          onClick={() => setShowNewStudent(true)}
          className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-sm bg-noir text-white text-label text-[13px] tap-target transition-opacity active:opacity-80"
        >
          <UserPlus size={15} />
          Registrar
        </button>
      </header>

      {/* Search */}
      <div className="relative px-4 mb-4">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por nombre, correo o teléfono..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border border-nude-border rounded-sm pl-9 pr-4 py-3 text-label text-noir bg-white placeholder:text-stone focus:outline-none focus:border-nude"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="mx-4 flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="px-4 flex flex-col items-start gap-3">
          <p className="text-label text-stone">
            {search ? 'Sin resultados para tu búsqueda' : 'No hay alumnas registradas'}
          </p>
          {!search && (
            <Button variant="ghost" size="sm" onClick={() => setShowNewStudent(true)}>
              + Registrar la primera
            </Button>
          )}
        </div>
      ) : (
        <div>
          {students.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              onAdjust={setEditStudent}
              onRoleChanged={() => fetchStudents(search)}
              onDelete={setDeleteTarget}
              onPasswordReset={setPasswordTarget}
              onGiftClass={handleGiftClass}
            />
          ))}
        </div>
      )}

      {showNewStudent && (
        <NewStudentSheet
          onClose={(didCreate) => {
            setShowNewStudent(false)
            if (didCreate) fetchStudents(search)
          }}
        />
      )}

      {editStudent && (
        <AssignPlanSheet
          student={editStudent}
          onClose={() => setEditStudent(null)}
          onSaved={() => {
            setEditStudent(null)
            fetchStudents(search)
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteSheet
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            fetchStudents(search)
          }}
        />
      )}

      {passwordTarget && (
        <PasswordResetSheet
          student={passwordTarget}
          onClose={() => setPasswordTarget(null)}
        />
      )}
    </div>
  )
}
