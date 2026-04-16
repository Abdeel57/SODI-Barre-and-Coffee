import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp, Pencil, Trash2, Plus, Eye, EyeOff } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { BottomSheet } from '../../components/ui/BottomSheet'
import type { AdminCoach, AdminCoachClass, DeleteBlockedError } from '../../types/admin'

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// ─── Confirm Delete Sheet ─────────────────────────────────────────────────────

function ConfirmDeleteCoachSheet({
  coach,
  onClose,
  onDeleted,
}: {
  coach: AdminCoach
  onClose: () => void
  onDeleted: () => void
}) {
  const showToast = useStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState<DeleteBlockedError | null>(null)

  async function handleDelete() {
    setLoading(true)
    try {
      await adminApi.deleteCoach(coach.id)
      showToast(`${coach.name} eliminada`, 'success')
      onDeleted()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: DeleteBlockedError } })?.response?.data
      if (data?.reason === 'HAS_PAYMENTS') {
        setBlocked(data)
      } else {
        showToast('Error al eliminar la coach', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Eliminar coach">
      {blocked ? (
        <div className="flex flex-col gap-4">
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-label text-noir font-medium mb-1">No se puede eliminar</p>
            <p className="text-stone text-[13px]">
              {coach.name} tiene <strong>{blocked.paymentCount}</strong>{' '}
              {blocked.paymentCount === 1 ? 'pago registrado' : 'pagos registrados'} en el sistema.
            </p>
          </div>
          <Button variant="ghost" size="lg" onClick={onClose} className="w-full">
            Entendido
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-label text-noir font-medium mb-1">¿Eliminar a {coach.name}?</p>
            <p className="text-stone text-[13px]">
              Las clases asignadas quedarán sin coach. Esta acción no se puede deshacer.
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

// ─── Coach Form Sheet (create / edit) ─────────────────────────────────────────

interface CoachFormData {
  name: string
  email: string
  phone: string
  password: string
}

function CoachFormSheet({
  coach,
  onClose,
  onSaved,
}: {
  coach: AdminCoach | null   // null = crear
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useStore((s) => s.showToast)
  const isNew = coach === null

  const [form, setForm] = useState<CoachFormData>({
    name:     coach?.name  ?? '',
    email:    coach?.email ?? '',
    phone:    coach?.phone ?? '',
    password: '',
  })
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<Partial<CoachFormData>>({})

  function set(key: keyof CoachFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: Partial<CoachFormData> = {}
    if (!form.name.trim() || form.name.trim().length < 2)  errs.name     = 'Mínimo 2 caracteres'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email inválido'
    if (isNew && form.password.length < 8)                  errs.password = 'Mínimo 8 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      if (isNew) {
        await adminApi.createCoach({
          name:     form.name.trim(),
          email:    form.email.trim(),
          phone:    form.phone.trim() || undefined,
          password: form.password,
        })
        showToast('Coach creada correctamente', 'success')
      } else {
        await adminApi.updateCoach(coach.id, {
          name:  form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
        })
        showToast('Datos actualizados', 'success')
      }
      onSaved()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (msg?.includes('email')) {
        showToast('Ya existe un usuario con ese email', 'error')
      } else {
        showToast('Error al guardar', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-nude-border rounded-sm px-4 py-3 text-label text-noir bg-white focus:outline-none focus:border-nude placeholder:text-stone'
  const errorCls = 'text-red-500 text-[11px] mt-0.5'

  return (
    <BottomSheet
      isOpen={true}
      onClose={onClose}
      title={isNew ? 'Nueva coach' : `Editar — ${coach.name.split(' ')[0]}`}
    >
      <div className="flex flex-col gap-4">
        {/* Nombre */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Nombre completo</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Sofía Reyes"
            className={inputCls}
          />
          {errors.name && <p className={errorCls}>{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="coach@sodibarre.com"
            className={inputCls}
          />
          {errors.email && <p className={errorCls}>{errors.email}</p>}
        </div>

        {/* Teléfono (opcional) */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Teléfono <span className="text-stone/60">(opcional)</span></label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="Ej: 555 123 4567"
            className={inputCls}
          />
        </div>

        {/* Contraseña — solo al crear */}
        {isNew && (
          <div className="flex flex-col gap-1">
            <label className="text-label text-stone">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
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
            {errors.password && <p className={errorCls}>{errors.password}</p>}
          </div>
        )}

        <Button variant="primary" size="lg" loading={loading} onClick={handleSave} className="w-full">
          {isNew ? 'Crear coach' : 'Guardar cambios'}
        </Button>
      </div>
    </BottomSheet>
  )
}

// ─── CoachCard ────────────────────────────────────────────────────────────────

function CoachCard({
  coach,
  onEdit,
  onDelete,
}: {
  coach: AdminCoach
  onEdit: (c: AdminCoach) => void
  onDelete: (c: AdminCoach) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const memberSince = (() => {
    try { return format(parseISO(coach.createdAt), "d 'de' MMMM, yyyy", { locale: es }) }
    catch { return '' }
  })()

  return (
    <div className="bg-white border border-nude-border rounded-md mx-4 mb-2">
      {/* Header row */}
      <button
        className="flex items-center gap-3 p-4 w-full tap-target text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-nude-light flex items-center justify-center shrink-0">
          <span className="text-title text-[18px] text-nude-dark font-display">
            {coach.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-noir truncate">{coach.name}</p>
          <p className="text-stone text-xs truncate">{coach.email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-nude-light text-nude-dark border border-nude">
            {coach.coachClasses.length} {coach.coachClasses.length === 1 ? 'clase' : 'clases'}
          </span>
          {expanded ? <ChevronUp size={14} className="text-stone" /> : <ChevronDown size={14} className="text-stone" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-nude-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-y-2 mb-3">
            {coach.phone && (
              <div className="col-span-2">
                <p className="text-stone text-xs">Teléfono</p>
                <p className="text-label text-noir">{coach.phone}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-stone text-xs">Miembro desde</p>
              <p className="text-label text-noir capitalize">{memberSince}</p>
            </div>
          </div>

          {/* Assigned classes */}
          {coach.coachClasses.length > 0 ? (
            <div className="mb-3">
              <p className="text-stone text-xs mb-2">Clases asignadas</p>
              <div className="flex flex-col gap-1">
                {coach.coachClasses.map((cls: AdminCoachClass) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between px-3 py-2 bg-nude/10 rounded-sm border border-nude-border"
                  >
                    <p className="text-label text-noir text-[13px]">{cls.name}</p>
                    <p className="text-stone text-[11px]">
                      {DAY_LABELS[cls.dayOfWeek]} · {cls.startTime}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-3 px-3 py-2 bg-nude-border/20 rounded-sm">
              <p className="text-stone text-xs">Sin clases asignadas</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(coach)}
              className="flex items-center gap-1.5 text-stone text-[12px] px-3 py-1.5 rounded-sm border border-nude-border hover:border-nude transition-colors"
            >
              <Pencil size={13} />
              Editar
            </button>
            <button
              onClick={() => onDelete(coach)}
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

export default function AdminCoachesPage() {
  const showToast = useStore((s) => s.showToast)
  const [coaches,       setCoaches]       = useState<AdminCoach[]>([])
  const [loading,       setLoading]       = useState(true)
  const [formTarget,    setFormTarget]    = useState<AdminCoach | 'new' | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<AdminCoach | null>(null)

  const fetchCoaches = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.getCoaches()
      setCoaches(r.data.data as AdminCoach[])
    } catch {
      showToast('Error al cargar coaches', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchCoaches() }, [fetchCoaches])

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-4 pt-8 pb-4">
        <p className="text-section text-stone text-[11px]">ADMINISTRACIÓN</p>
        <h1 className="text-hero text-noir mt-0.5">Coaches</h1>
      </header>

      {/* List */}
      {loading ? (
        <div className="mx-4 flex flex-col gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : coaches.length === 0 ? (
        <p className="text-label text-stone px-4">No hay coaches registradas</p>
      ) : (
        <div>
          {coaches.map((c) => (
            <CoachCard
              key={c.id}
              coach={c}
              onEdit={setFormTarget}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setFormTarget('new')}
        className="fixed bottom-24 right-5 z-20 w-12 h-12 rounded-full bg-noir text-white shadow-lg flex items-center justify-center tap-target transition-transform active:scale-95 md:bottom-8"
        aria-label="Agregar coach"
      >
        <Plus size={22} />
      </button>

      {/* Form sheet */}
      {formTarget !== null && (
        <CoachFormSheet
          coach={formTarget === 'new' ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null)
            fetchCoaches()
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDeleteCoachSheet
          coach={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            fetchCoaches()
          }}
        />
      )}
    </div>
  )
}
