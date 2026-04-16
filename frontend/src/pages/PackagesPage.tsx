import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Sparkles, Star } from 'lucide-react'
import { packagesApi } from '../api'
import { useStore } from '../store/useStore'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { Package, Subscription } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n)
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PackageSkeleton({ wide = false }: { wide?: boolean }) {
  return wide ? (
    <div className="bg-white border border-nude-border rounded-2xl p-5 flex flex-col gap-3">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="h-7 w-28 rounded" />
      <Skeleton className="h-10 w-36 rounded" />
      <div className="flex gap-3 mt-1">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
      <Skeleton className="h-11 w-full rounded-md mt-1" />
    </div>
  ) : (
    <div className="bg-white border border-nude-border rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-3 w-48 rounded" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16 rounded" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  )
}

// ─── Individual class card ────────────────────────────────────────────────────
function IndividualCard({
  pkg,
  isCurrentPlan,
  loadingId,
  onSelect,
}: {
  pkg: Package
  isCurrentPlan: boolean
  loadingId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-opacity ${
        isCurrentPlan ? 'border-nude opacity-60' : 'border-nude-border'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-body text-[15px] font-medium text-noir leading-tight">{pkg.name}</p>
        {pkg.description && (
          <p className="text-label text-stone text-[11px] mt-0.5 leading-relaxed">{pkg.description}</p>
        )}
        <p className="text-label text-stone/60 text-[11px] mt-1">Válido {pkg.validDays} días</p>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="font-display text-[22px] font-light text-noir leading-none">
          {fmt(pkg.priceMXN)}
        </span>
        <Button
          variant={isCurrentPlan ? 'secondary' : 'primary'}
          size="sm"
          disabled={isCurrentPlan}
          loading={loadingId === pkg.id}
          onClick={() => onSelect(pkg.id)}
          className="text-[12px] py-1.5 px-3"
        >
          {isCurrentPlan ? 'Activo' : 'Elegir'}
        </Button>
      </div>
    </div>
  )
}

// ─── Multi-class package card ─────────────────────────────────────────────────
function PackageCard({
  pkg,
  badge,
  isCurrentPlan,
  loadingId,
  onSelect,
}: {
  pkg: Package
  badge: 'popular' | 'value' | null
  isCurrentPlan: boolean
  loadingId: string | null
  onSelect: (id: string) => void
}) {
  const pricePerClass = pkg.classCount ? Math.round(pkg.priceMXN / pkg.classCount) : null
  const isPopular = badge === 'popular'

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
        isPopular
          ? 'bg-noir shadow-lg shadow-noir/10'
          : 'bg-white border border-nude-border'
      } ${isCurrentPlan ? 'opacity-60' : ''}`}
    >
      {/* Badge */}
      {badge && (
        <div
          className={`flex items-center gap-1.5 px-4 pt-4 pb-0`}
        >
          {isPopular ? (
            <span className="flex items-center gap-1 text-nude text-[10px] font-body tracking-widest uppercase">
              <Star size={10} fill="currentColor" />
              Más popular
            </span>
          ) : (
            <span className="flex items-center gap-1 text-nude-dark text-[10px] font-body tracking-widest uppercase">
              <Sparkles size={10} />
              Mejor precio/clase
            </span>
          )}
        </div>
      )}

      <div className="px-5 pt-4 pb-5 flex flex-col gap-4">
        {/* Name + price */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              className={`font-display text-[26px] font-light leading-tight ${
                isPopular ? 'text-white' : 'text-noir'
              }`}
            >
              {pkg.name}
            </h3>
            {pricePerClass && (
              <p className={`text-label text-[12px] mt-0.5 ${isPopular ? 'text-white/50' : 'text-stone/70'}`}>
                {fmt(pricePerClass)} por clase
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`font-display text-[32px] font-light leading-none ${isPopular ? 'text-white' : 'text-noir'}`}>
              {fmt(pkg.priceMXN)}
            </p>
            <p className={`text-label text-[10px] ${isPopular ? 'text-white/50' : 'text-stone/60'}`}>MXN</p>
          </div>
        </div>

        {/* Features */}
        <div
          className={`flex flex-col gap-1.5 py-3 border-t border-b ${
            isPopular ? 'border-white/10' : 'border-nude-border'
          }`}
        >
          {[
            `${pkg.classCount} clases incluidas`,
            `Válido ${pkg.validDays} días`,
            'Reservas desde la app',
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isPopular ? 'bg-nude/20' : 'bg-nude-light'
                }`}
              >
                <Check size={10} strokeWidth={2.5} className={isPopular ? 'text-nude' : 'text-nude-dark'} />
              </div>
              <span className={`text-[13px] font-body ${isPopular ? 'text-white/80' : 'text-stone'}`}>
                {feat}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          disabled={isCurrentPlan || loadingId === pkg.id}
          onClick={() => onSelect(pkg.id)}
          className={`w-full py-3.5 rounded-md text-label tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 ${
            isPopular
              ? 'bg-nude text-white hover:bg-nude-dark'
              : 'bg-noir text-white hover:bg-noir/90'
          }`}
        >
          {loadingId === pkg.id
            ? 'Procesando…'
            : isCurrentPlan
            ? 'Plan actual'
            : 'Seleccionar'}
        </button>
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 pt-6 pb-2">
      <h2 className="text-section text-stone text-[10px] uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="font-body text-[13px] text-stone/70 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PackagesPage() {
  const showToast = useStore((s) => s.showToast)
  const [searchParams, setSearchParams] = useSearchParams()

  const [packages,     setPackages]     = useState<Package[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loadingId,    setLoadingId]    = useState<string | null>(null)

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
    if (status) setSearchParams({}, { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

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

  // Split packages into individual (1 class) and multi-class
  const individualPkgs = packages
    .filter((p) => p.classCount === 1)
    .sort((a, b) => a.priceMXN - b.priceMXN)

  const multiPkgs = packages
    .filter((p) => p.classCount !== null && p.classCount > 1)
    .sort((a, b) => a.priceMXN - b.priceMXN)

  // Badge logic: popular = 8 Clases; best value = cheapest price/class (20 Clases)
  function badgeFor(pkg: Package): 'popular' | 'value' | null {
    if (pkg.id === 'pkg_8clases') return 'popular'
    if (pkg.id === 'pkg_20clases') return 'value'
    return null
  }

  const currentPkgId = subscription?.isActive ? subscription.packageId : null

  // Progress bar for active subscription
  const currentPkg = subscription ? packages.find((p) => p.id === subscription.packageId) : null
  const progressPct =
    subscription && currentPkg?.classCount
      ? Math.max(0, Math.min(100, ((subscription.classesLeft ?? 0) / currentPkg.classCount) * 100))
      : null

  return (
    <div className="min-h-screen bg-off-white pb-nav page-enter">
      {/* Header */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-section text-stone text-[11px]">COMPRAR</p>
        <h1 className="text-hero text-noir mt-1">Paquetes</h1>
        <p className="font-body text-[13px] text-stone mt-1">
          Elige el plan que mejor se adapte a tu ritmo.
        </p>
      </header>

      {/* Active subscription banner */}
      {!loading && subscription?.isActive && (
        <div className="mx-4 mt-5 bg-noir rounded-2xl p-5 liquid-glass">
          <p className="text-section text-nude text-[10px] uppercase tracking-widest mb-1">Tu plan activo</p>
          <p className="font-display text-[22px] font-light text-white">{subscription.packageName}</p>
          <p className="text-label text-white/60 mt-1">
            {subscription.classesLeft !== null
              ? `${subscription.classesLeft} clase${subscription.classesLeft !== 1 ? 's' : ''} restante${subscription.classesLeft !== 1 ? 's' : ''}`
              : 'Clases ilimitadas'
            }
            {' · '}
            Vence en {subscription.daysLeft} día{subscription.daysLeft !== 1 ? 's' : ''}
          </p>
          {progressPct !== null && (
            <div className="bg-white/15 rounded-full h-1.5 w-full mt-3">
              <div
                className="bg-nude rounded-full h-1.5 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Clases individuales ──────────────────────────────────────────────── */}
      <SectionHeader
        title="Clases individuales"
        subtitle="Sin compromiso · Válido 1 mes"
      />

      <div className="px-4 flex flex-col gap-2.5">
        {loading ? (
          <>
            <PackageSkeleton />
            <PackageSkeleton />
            <PackageSkeleton />
          </>
        ) : individualPkgs.length === 0 ? (
          <p className="text-label text-stone/50 px-1 py-4">Sin paquetes individuales disponibles.</p>
        ) : (
          individualPkgs.map((pkg) => (
            <IndividualCard
              key={pkg.id}
              pkg={pkg}
              isCurrentPlan={currentPkgId === pkg.id}
              loadingId={loadingId}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* ── Paquetes de clases ───────────────────────────────────────────────── */}
      <SectionHeader
        title="Paquetes de clases"
        subtitle="Ahorra más conforme compras más clases"
      />

      <div className="px-4 flex flex-col gap-3 pb-2">
        {loading ? (
          <>
            <PackageSkeleton wide />
            <PackageSkeleton wide />
            <PackageSkeleton wide />
            <PackageSkeleton wide />
          </>
        ) : multiPkgs.length === 0 ? (
          <p className="text-label text-stone/50 px-1 py-4">Sin paquetes disponibles.</p>
        ) : (
          multiPkgs.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              badge={badgeFor(pkg)}
              isCurrentPlan={currentPkgId === pkg.id}
              loadingId={loadingId}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-6">
        <p className="text-label text-stone/50 text-[11px] text-center leading-relaxed">
          Los paquetes son personales e intransferibles.{'\n'}
          Todos los precios incluyen IVA. · SODI Barre & Coffee
        </p>
      </div>
    </div>
  )
}
