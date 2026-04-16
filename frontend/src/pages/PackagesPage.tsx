import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { packagesApi } from '../api'
import { useStore } from '../store/useStore'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { Package, Subscription } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PackageSkeleton() {
  return (
    <div className="bg-white border border-nude-border rounded-lg p-5 flex flex-col gap-3">
      <Skeleton className="h-5 w-32 rounded" />
      <Skeleton className="h-3 w-48 rounded" />
      <Skeleton className="h-10 w-24 rounded" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

// ─── PackageCard ──────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: Package
  isPopular: boolean
  isCurrentPlan: boolean
  onSelect: (id: string) => void
  loadingId: string | null
}

function PackageCard({ pkg, isPopular, isCurrentPlan, onSelect, loadingId }: PackageCardProps) {
  const description =
    pkg.classCount !== null
      ? `${pkg.classCount} clases para usar en ${pkg.validDays} días`
      : `Clases ilimitadas por ${pkg.validDays} días`

  return (
    <div
      className={`relative bg-white rounded-lg p-5 border transition-opacity ${
        isPopular ? 'border-nude' : 'border-nude-border'
      } ${isCurrentPlan ? 'opacity-60' : ''}`}
    >
      {isPopular && (
        <span className="absolute top-4 right-4 bg-nude text-white text-[10px] px-2 py-0.5 rounded-full">
          Más popular
        </span>
      )}

      <h3 className="text-title text-noir text-[22px]">{pkg.name}</h3>
      <p className="text-label text-stone mt-1">{description}</p>

      <div className="flex items-baseline gap-1 mt-4">
        <span className="font-display text-4xl font-light text-noir">
          {formatMXN(pkg.priceMXN)}
        </span>
        <span className="text-label text-stone">MXN</span>
      </div>

      <hr className="border-nude-border my-4" />

      <Button
        variant="primary"
        size="lg"
        disabled={isCurrentPlan}
        loading={loadingId === pkg.id}
        onClick={() => onSelect(pkg.id)}
        className={`w-full ${!isCurrentPlan ? 'liquid-glass-strong' : ''}`}
      >
        {isCurrentPlan ? 'Plan actual' : 'Seleccionar'}
      </Button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PackagesPage() {
  const showToast = useStore((s) => s.showToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const [packages, setPackages] = useState<Package[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [pkgRes, subRes] = await Promise.all([
        packagesApi.list(),
        packagesApi.mySubscription().catch(() => null),
      ])
      setPackages(pkgRes.data.data as Package[])
      setSubscription((subRes?.data?.subscription as Subscription) ?? null)
    } catch {
      showToast('Error al cargar paquetes', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  // Handle MercadoPago return
  useEffect(() => {
    const status = searchParams.get('status')
    if (status === 'success') {
      showToast('¡Pago exitoso! Tu plan está activo 🎉', 'success')
      packagesApi.mySubscription().then((r) => {
        setSubscription((r.data?.subscription as Subscription) ?? null)
      }).catch(() => null)
    } else if (status === 'failure') {
      showToast('El pago no se completó', 'error')
    } else if (status === 'pending') {
      showToast('Pago pendiente de confirmación', 'info')
    }
    if (status) {
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleSelect(packageId: string) {
    setLoadingId(packageId)
    try {
      const res = await packagesApi.createPreference(packageId)
      const { initPoint } = res.data as { initPoint: string }
      window.location.href = initPoint
    } catch {
      showToast('Error al procesar. Intenta de nuevo.', 'error')
      setLoadingId(null)
    }
  }

  // Active subscription banner
  const currentPkg = subscription
    ? packages.find((p) => p.id === subscription.packageId)
    : null

  const progressPct =
    subscription && currentPkg?.classCount
      ? Math.max(0, Math.min(100, (subscription.classesLeft ?? 0) / currentPkg.classCount * 100))
      : null

  // Popular = middle package by price
  const sortedByPrice = [...packages].sort((a, b) => a.priceMXN - b.priceMXN)
  const popularId = sortedByPrice.length >= 2 ? sortedByPrice[Math.floor(sortedByPrice.length / 2)]?.id : null

  return (
    <div className="min-h-screen bg-off-white pb-24 page-enter">
      <header className="px-5 pt-12 pb-4">
        <p className="text-section text-stone text-[11px]">COMPRAR</p>
        <h1 className="text-hero text-noir mt-1">Paquetes</h1>
      </header>

      {/* Active subscription banner */}
      {!loading && subscription?.isActive && (
        <div className="mx-4 mb-6 bg-noir rounded-md p-4 liquid-glass">
          <p className="text-section text-nude text-[10px] uppercase tracking-widest mb-1">Tu plan actual</p>
          <p className="text-title text-white text-[20px]">{subscription.packageName}</p>
          <p className="text-label text-white/60 mt-1">
            {subscription.classesLeft !== null
              ? `${subscription.classesLeft} clases restantes · Vence en ${subscription.daysLeft} días`
              : `Clases ilimitadas · Vence en ${subscription.daysLeft} días`}
          </p>
          {progressPct !== null && (
            <div className="bg-white/20 rounded-full h-1 w-full mt-3">
              <div
                className="bg-nude rounded-full h-1 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Package list */}
      <div className="px-4 flex flex-col gap-4">
        {loading ? (
          <>
            <PackageSkeleton />
            <PackageSkeleton />
            <PackageSkeleton />
          </>
        ) : (
          packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isPopular={pkg.id === popularId}
              isCurrentPlan={subscription?.packageId === pkg.id && !!subscription?.isActive}
              onSelect={handleSelect}
              loadingId={loadingId}
            />
          ))
        )}
      </div>
    </div>
  )
}
