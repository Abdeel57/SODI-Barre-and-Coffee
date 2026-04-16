import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomSheet } from '../../components/ui/BottomSheet'
import type { AdminClass, CoachUser } from '../../types/admin'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const DAY_LABELS: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ─── Class Form Sheet ─────────────────────────────────────────────────────────

interface FormState {
  name: string
  instructor: string
  dayOfWeek: number
  startTime: string
  durationMin: number
  maxCapacity: number
}

interface FormErrors {
  name?: string
  instructor?: string
  startTime?: string
}

const DEFAULT_FORM: FormState = {
  name: '', instructor: '', dayOfWeek: 1,
  startTime: '09:00', durationMin: 55, maxCapacity: 12,
}

function ClassFormSheet({
  isOpen, editClass, coaches, onClose, onSaved,
}: {
  isOpen: boolean
  editClass: AdminClass | null
  coaches: CoachUser[]
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useStore((s) => s.showToast)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [coachId, setCoachId] = useState<string>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editClass) {
      setForm({
        name: editClass.name,
        instructor: editClass.instructor,
        dayOfWeek: editClass.dayOfWeek,
        startTime: editClass.startTime,
        durationMin: editClass.durationMin,
        maxCapacity: editClass.maxCapacity,
      })
      setCoachId(editClass.coachId ?? '')
    } else {
      setForm(DEFAULT_FORM)
      setCoachId('')
    }
    setErrors({})
  }, [editClass, isOpen])

  function validate(): boolean {
    const e: FormErrors = {}
    if (form.name.trim().length < 2) e.name = 'Mínimo 2 caracteres'
    if (form.instructor.trim().length < 2) e.instructor = 'Mínimo 2 caracteres'
    if (!/^\d{2}:\d{2}$/.test(form.startTime)) e.startTime = 'Formato inválido (HH:MM)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        instructor: form.instructor.trim(),
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        durationMin: form.durationMin,
        maxCapacity: form.maxCapacity,
        coachId: coachId || null,
      }
      if (editClass) {
        await adminApi.updateClass(editClass.id, payload)
        showToast('Clase actualizada', 'success')
      } else {
        await adminApi.createClass(payload)
        showToast('Clase creada', 'success')
      }
      onSaved()
    } catch {
      showToast('Error al guardar la clase', 'error')
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={() => {}} title={editClass ? 'Editar clase' : 'Nueva clase'}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre de la clase"
          placeholder="Ej. Barre Fundamentals"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          error={errors.name}
        />
        <Input
          label="Instructora"
          placeholder="Ej. Sofía Reyes"
          value={form.instructor}
          onChange={(e) => setField('instructor', e.target.value)}
          error={errors.instructor}
        />
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Día de la semana</label>
          <select
            value={form.dayOfWeek}
            onChange={(e) => setField('dayOfWeek', parseInt(e.target.value))}
            className="w-full border border-nude-border rounded-sm px-4 py-3 text-label bg-white text-noir focus:outline-none focus:border-nude"
          >
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>{DAY_LABELS[d]}</option>
            ))}
          </select>
        </div>
        <Input
          label="Hora de inicio (HH:MM)"
          placeholder="09:00"
          value={form.startTime}
          onChange={(e) => setField('startTime', e.target.value)}
          error={errors.startTime}
          maxLength={5}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Duración (min)"
            type="number"
            min={30}
            max={120}
            value={String(form.durationMin)}
            onChange={(e) => setField('durationMin', Math.max(30, parseInt(e.target.value) || 55))}
          />
          <Input
            label="Cupo máximo"
            type="number"
            min={1}
            max={30}
            value={String(form.maxCapacity)}
            onChange={(e) => setField('maxCapacity', Math.max(1, parseInt(e.target.value) || 12))}
          />
        </div>

        {/* Coach selector */}
        <div className="flex flex-col gap-1">
          <label className="text-label text-stone">Coach asignada</label>
          <select
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
            className="w-full border border-nude-border rounded-sm px-4 py-3 text-label bg-white text-noir focus:outline-none focus:border-nude appearance-none"
          >
            <option value="">Sin asignar</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <Button variant="primary" size="lg" loading={loading} onClick={handleSubmit} className="w-full liquid-glass-strong mt-1">
          Guardar clase
        </Button>
        <button className="text-label text-stone text-center py-1" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── AdminClassCard ───────────────────────────────────────────────────────────

function AdminClassCard({ cls, onEdit, onToggle }: {
  cls: AdminClass
  onEdit: (c: AdminClass) => void
  onToggle: (c: AdminClass) => Promise<void>
}) {
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    await onToggle(cls)
    setToggling(false)
  }

  return (
    <div className={`bg-white border border-nude-border rounded-md mx-4 mb-2 p-4 transition-opacity ${!cls.isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-noir truncate">{cls.name}</p>
          <p className="text-stone text-xs mt-0.5">
            {formatTime(cls.startTime)} · {cls.durationMin} min · {cls.instructor}
          </p>
          {cls.coachName && (
            <p className="text-stone text-[11px] mt-0.5">Coach: {cls.coachName}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-label text-stone text-xs">{cls.maxCapacity} cupos</p>
          <p className="text-stone text-xs">{cls.bookingsThisWeek} esta semana</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {cls.isActive ? (
          <Button variant="ghost" size="sm" loading={toggling} onClick={handleToggle}>Pausar</Button>
        ) : (
          <Button variant="secondary" size="sm" loading={toggling} onClick={handleToggle}>Activar</Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(cls)}>Editar</Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminClassesPage() {
  const showToast = useStore((s) => s.showToast)
  const [classes, setClasses] = useState<AdminClass[]>([])
  const [coaches, setCoaches] = useState<CoachUser[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editClass, setEditClass] = useState<AdminClass | null>(null)

  const fetchClasses = useCallback(async () => {
    try {
      const [classRes, coachRes] = await Promise.all([
        adminApi.getClasses(),
        adminApi.getCoaches(),
      ])
      setClasses(classRes.data.data as AdminClass[])
      setCoaches(coachRes.data.data as CoachUser[])
    } catch {
      showToast('Error al cargar clases', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  function openEdit(cls: AdminClass) { setEditClass(cls); setFormOpen(true) }
  function openNew() { setEditClass(null); setFormOpen(true) }

  const handleToggle = useCallback(async (cls: AdminClass) => {
    try {
      await adminApi.toggleClass(cls.id, !cls.isActive)
      await fetchClasses()
    } catch {
      showToast('Error al actualizar la clase', 'error')
    }
  }, [fetchClasses, showToast])

  function handleSaved() { setFormOpen(false); fetchClasses() }

  const grouped = DAY_ORDER.reduce<Record<number, AdminClass[]>>((acc, d) => {
    acc[d] = classes.filter((c) => c.dayOfWeek === d)
    return acc
  }, {} as Record<number, AdminClass[]>)

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="flex items-center justify-between px-4 pt-8 pb-4">
        <div>
          <p className="text-section text-stone text-[11px]">GESTIÓN</p>
          <h1 className="text-hero text-noir mt-0.5">Clases</h1>
        </div>
        <Button variant="primary" size="sm" onClick={openNew} className="liquid-glass-strong shrink-0">
          + Nueva clase
        </Button>
      </header>

      {loading ? (
        <div className="mx-4 flex flex-col gap-3 mt-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-md" />)}
        </div>
      ) : (
        DAY_ORDER.map((d) => {
          const list = grouped[d]
          if (!list || list.length === 0) return null
          return (
            <div key={d}>
              <p className="text-section text-stone text-[11px] px-4 mt-6 mb-2 uppercase">
                {DAY_LABELS[d]}
              </p>
              {list.map((cls) => (
                <AdminClassCard key={cls.id} cls={cls} onEdit={openEdit} onToggle={handleToggle} />
              ))}
            </div>
          )
        })
      )}

      <ClassFormSheet
        isOpen={formOpen}
        editClass={editClass}
        coaches={coaches}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
