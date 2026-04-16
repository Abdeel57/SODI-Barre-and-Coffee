import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'
import { Button } from '../../components/ui/Button'
import type { AdminPayment } from '../../types/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMXN(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n)
}

type StatusFilter = '' | 'APPROVED' | 'PENDING' | 'REJECTED'

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: '' },
  { label: 'Aprobados', value: 'APPROVED' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Rechazados', value: 'REJECTED' },
]

const STATUS_BADGE: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  REJECTED: 'bg-nude-light text-stone',
}
const STATUS_LABEL: Record<string, string> = {
  APPROVED: 'Aprobado',
  PENDING: 'Pendiente',
  REJECTED: 'Rechazado',
}

// ─── PaymentRow ───────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: AdminPayment }) {
  const dateLabel = (() => {
    try { return format(parseISO(payment.createdAt), "dd MMM · HH:mm", { locale: es }) }
    catch { return '' }
  })()

  return (
    <div className="bg-white border-b border-nude-border px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-nude-light flex items-center justify-center shrink-0">
        <span className="text-[13px] text-nude-dark font-medium">
          {payment.student.name.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label text-noir truncate">{payment.student.name}</p>
        <p className="text-stone text-xs truncate">{payment.packageName ?? '—'}</p>
        <p className="text-stone text-xs capitalize">{dateLabel}</p>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <p className="text-label text-noir">{formatMXN(payment.amountMXN)}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_BADGE[payment.status] ?? 'bg-nude-light text-stone'}`}>
          {STATUS_LABEL[payment.status] ?? payment.status}
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const showToast = useStore((s) => s.showToast)
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const LIMIT = 20

  const fetchPayments = useCallback(async (filter: StatusFilter, reset: boolean) => {
    if (reset) { setLoading(true); setPage(1) }
    try {
      const p = reset ? 1 : page
      const r = await adminApi.getPayments({
        page: p,
        limit: LIMIT,
        status: filter || undefined,
      })
      const { data, pagination } = r.data as {
        data: AdminPayment[]
        pagination: { total: number; pages: number; page: number }
      }
      if (reset) {
        setPayments(data)
      } else {
        setPayments((prev) => [...prev, ...data])
      }
      setHasMore(pagination.page < pagination.pages)
    } catch {
      showToast('Error al cargar pagos', 'error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [page, showToast])

  useEffect(() => {
    fetchPayments(statusFilter, true)
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    try {
      const r = await adminApi.getPayments({
        page: nextPage, limit: LIMIT, status: statusFilter || undefined,
      })
      const { data, pagination } = r.data as {
        data: AdminPayment[]
        pagination: { total: number; pages: number; page: number }
      }
      setPayments((prev) => [...prev, ...data])
      setHasMore(pagination.page < pagination.pages)
    } catch {
      showToast('Error al cargar más pagos', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  // Month summary from approved payments
  const now = new Date()
  const monthPayments = payments.filter((p) => {
    if (p.status !== 'APPROVED') return false
    try {
      const d = parseISO(p.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    } catch { return false }
  })
  const monthTotal = monthPayments.reduce((sum, p) => sum + p.amountMXN, 0)

  return (
    <div className="min-h-screen bg-off-white pb-8 page-enter">
      <header className="px-4 pt-8 pb-4">
        <p className="text-section text-stone text-[11px]">FINANZAS</p>
        <h1 className="text-hero text-noir mt-0.5">Pagos</h1>
      </header>

      {/* Month summary */}
      {!loading && (
        <div className="mx-4 mb-5 bg-white border border-nude-border rounded-lg p-4 liquid-glass">
          <p className="text-section text-stone text-[10px] uppercase tracking-widest mb-2">INGRESOS DEL MES</p>
          <span className="font-display text-4xl font-light text-noir">{formatMXN(monthTotal)}</span>
          <p className="text-stone text-sm mt-1 capitalize">
            {monthPayments.length} pago{monthPayments.length !== 1 ? 's' : ''} aprobado{monthPayments.length !== 1 ? 's' : ''} este mes
          </p>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`text-label px-4 py-1.5 rounded-full whitespace-nowrap transition-colors duration-150 shrink-0 ${
              statusFilter === value ? 'bg-noir text-white' : 'text-stone'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="mx-4 flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-md" />)}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-label text-stone px-4">Sin pagos registrados</p>
      ) : (
        <div className="bg-white border border-nude-border rounded-lg mx-4 overflow-hidden">
          {payments.map((p) => <PaymentRow key={p.id} payment={p} />)}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-4 px-4">
          <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadMore}>
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
