import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { BottomSheet } from '../../components/ui/BottomSheet'
import type { AdminStudent } from '../../types/admin'

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
}: {
  student: AdminStudent
  onAdjust: (s: AdminStudent) => void
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
        <div className="w-10 h-10 rounded-full bg-nude-light flex items-center justify-center shrink-0">
          <span className="text-title text-[18px] text-nude-dark font-display">
            {student.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-label font-medium text-noir truncate">{student.name}</p>
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
              <p className="text-stone text-xs">Total de clases</p>
              <p className="text-label text-noir">{student.totalBookings}</p>
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

          <Button variant="ghost" size="sm" onClick={() => onAdjust(student)}>
            {sub ? 'Ajustar plan' : '+ Asignar plan'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const showToast = useStore((s) => s.showToast)
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editStudent, setEditStudent] = useState<AdminStudent | null>(null)
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

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-4 pt-8 pb-4">
        <p className="text-section text-stone text-[11px]">ALUMNAS</p>
        <h1 className="text-hero text-noir mt-0.5">Estudiantes</h1>
      </header>

      {/* Search */}
      <div className="relative px-4 mb-4">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-stone pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por nombre o email..."
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
        <p className="text-label text-stone px-4">
          {search ? 'Sin resultados para tu búsqueda' : 'No hay alumnas registradas'}
        </p>
      ) : (
        <div>
          {students.map((s) => (
            <StudentCard key={s.id} student={s} onAdjust={setEditStudent} />
          ))}
        </div>
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
    </div>
  )
}
