import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Sparkles, Star, Loader2, AlertCircle, XCircle } from 'lucide-react'
import { packagesApi, paymentsApi } from '../api'
import { useStore } from '../store/useStore'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import type { Package, Promo, Subscription } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0,
  }).format(n)
}

/** Precio que se cobra hoy — cae al precio de lista si el back no envía promo. */
function priceOf(pkg: Package) {
  return pkg.finalPriceMXN ?? pkg.priceMXN
}

// ─── Banner de promo de inauguración ──────────────────────────────────────────
function PromoBanner({ promo }: { promo: Promo }) {
  return (
    <div className="mx-4 mt-5 relative overflow-hidden rounded-2xl border border-nude/40 bg-gradient-to-br from-nude-light via-nude-light to-white">
      {/* Círculo decorativo */}
      <div className="absolute -right-10 -top-12 w-40 h-40 rounded-full bg-nude/15" />

      <div className="relative px-5 py-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-nude-dark text-[10px] font-body uppercase tracking-widest">
            <Sparkles size={11} />
            {promo.headline}
          </span>
          <p className="font-display text-[24px] font-light text-noir leading-tight mt-1.5">
            {promo.discountPct}% de descuento
          </p>
          <p className="text-label text-stone text-[11px] mt-1 leading-relaxed">
            En todos los paquetes · Se aplica solo al pagar
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-center justify-center w-[68px] h-[68px] rounded-full bg-noir text-white">
          <span className="font-display text-[26px] font-light leading-none">
            −{promo.discountPct}
          </span>
          <span className="text-[9px] font-body tracking-widest text-nude">%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Pill de descuento ────────────────────────────────────────────────────────
function DiscountPill({ pct, dark = false }: { pct: number; dark?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-body tracking-widest uppercase ${
        dark ? 'bg-nude text-noir' : 'bg-noir text-white'
      }`}
    >
      −{pct}%
    </span>
  )
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
        <div className="flex items-center gap-2">
          <p className="font-body text-[15px] font-medium text-noir leading-tight">{pkg.name}</p>
          {pkg.promo && <DiscountPill pct={pkg.promo.discountPct} />}
        </div>
        {pkg.description && (
          <p className="text-label text-stone text-[11px] mt-0.5 leading-relaxed">{pkg.description}</p>
        )}
        <p className="text-label text-stone/60 text-[11px] mt-1">Válido {pkg.validDays} días</p>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex flex-col items-end leading-none">
          {pkg.promo && (
            <span className="font-body text-[12px] text-stone/60 line-through">
              {fmt(pkg.promo.originalPriceMXN)}
            </span>
          )}
          <span className="font-display text-[22px] font-light text-noir leading-none mt-0.5">
            {fmt(priceOf(pkg))}
          </span>
        </div>
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
  const price = priceOf(pkg)
  const pricePerClass = pkg.classCount ? Math.round(price / pkg.classCount) : null
  const isPopular = badge === 'popular'
  const promo = pkg.promo

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
        isPopular
          ? 'bg-noir shadow-lg shadow-noir/10'
          : 'bg-white border border-nude-border'
      } ${isCurrentPlan ? 'opacity-60' : ''}`}
    >
      {/* Badges */}
      {(badge || promo) && (
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-0">
          {badge ? (
            isPopular ? (
              <span className="flex items-center gap-1 text-nude text-[10px] font-body tracking-widest uppercase">
                <Star size={10} fill="currentColor" />
                Más popular
              </span>
            ) : (
              <span className="flex items-center gap-1 text-nude-dark text-[10px] font-body tracking-widest uppercase">
                <Sparkles size={10} />
                Mejor precio/clase
              </span>
            )
          ) : (
            <span />
          )}
          {promo && <DiscountPill pct={promo.discountPct} dark={isPopular} />}
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
            {promo && (
              <p
                className={`font-body text-[13px] line-through leading-none mb-1 ${
                  isPopular ? 'text-white/40' : 'text-stone/60'
                }`}
              >
                {fmt(promo.originalPriceMXN)}
              </p>
            )}
            <p className={`font-display text-[32px] font-light leading-none ${isPopular ? 'text-white' : 'text-noir'}`}>
              {fmt(price)}
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

          {promo && (
            <div className="flex items-center gap-2 pt-1">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isPopular ? 'bg-nude' : 'bg-noir'
                }`}
              >
                <Sparkles size={9} className={isPopular ? 'text-noir' : 'text-nude'} />
              </div>
              <span
                className={`text-[13px] font-body font-medium ${isPopular ? 'text-nude' : 'text-nude-dark'}`}
              >
                Ahorras {fmt(promo.savingsMXN)} por inauguración
              </span>
            </div>
          )}
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

// ─── Confirmación del pago al volver de MercadoPago ───────────────────────────
type ConfirmState = { state: 'idle' | 'checking' | 'approved' | 'failed' | 'unconfirmed' }

function PaymentBanner({ state }: { state: ConfirmState['state'] }) {
  if (state === 'idle' || state === 'approved') return null

  if (state === 'checking') {
    return (
      <div className="mx-4 mt-5 rounded-2xl border border-nude-border bg-white px-5 py-4 flex items-center gap-3">
        <Loader2 size={18} strokeWidth={1.5} className="text-nude-dark shrink-0 animate-spin" />
        <div className="min-w-0">
          <p className="font-body text-[14px] font-medium text-noir">Confirmando tu pago…</p>
          <p className="text-label text-stone text-[11px] mt-0.5 leading-relaxed">
            Estamos verificando con MercadoPago. No cierres la app.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="mx-4 mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
        <XCircle size={18} strokeWidth={1.5} className="text-red-500 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-body text-[14px] font-medium text-red-800">El pago no se completó</p>
          <p className="text-label text-red-700/80 text-[11px] mt-0.5 leading-relaxed">
            No se te hizo ningún cargo. Puedes intentar de nuevo cuando quieras.
          </p>
        </div>
      </div>
    )
  }

  // unconfirmed — la verdad: no sabemos todavía, y no vamos a inventar
  return (
    <div className="mx-4 mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
      <AlertCircle size={18} strokeWidth={1.5} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-body text-[14px] font-medium text-amber-900">
          Estamos confirmando tu pago
        </p>
        <p className="text-label text-amber-800/80 text-[11px] mt-0.5 leading-relaxed">
          Todavía no lo vemos acreditado. Si pagaste con OXXO o transferencia puede tardar.
          En cuanto se acredite te avisamos y tu paquete se activa solo — no vuelvas a pagar.
        </p>
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
  const [confirm,      setConfirm]      = useState<ConfirmState>({ state: 'idle' })

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

  // ── Regreso de MercadoPago ────────────────────────────────────────────────
  // El parámetro de la URL NO prueba que se haya cobrado: MercadoPago regresa
  // por aquí aunque el pago quede pendiente o se abandone. Se le pregunta al
  // servidor, que a su vez le pregunta a MercadoPago, antes de decir nada.
  useEffect(() => {
    const status = searchParams.get('status')
    if (!status) return

    setSearchParams({}, { replace: true })

    if (status === 'failure') {
      setConfirm({ state: 'failed' })
      return
    }

    let cancelled = false

    async function confirmPayment() {
      setConfirm({ state: 'checking' })

      // MercadoPago puede tardar unos segundos en acreditar
      for (let attempt = 0; attempt < 6; attempt++) {
        if (cancelled) return

        try {
          const { data } = await paymentsApi.reconcile()

          if (data?.status === 'APPROVED') {
            if (cancelled) return
            setConfirm({ state: 'approved' })
            showToast('¡Pago confirmado! Tu plan está activo 🎉', 'success')
            packagesApi.mySubscription()
              .then((r) => setSubscription((r.data?.subscription as Subscription) ?? null))
              .catch(() => null)
            return
          }

          if (data?.status === 'REJECTED') {
            if (cancelled) return
            setConfirm({ state: 'failed' })
            return
          }
        } catch {
          // Sin conexión o error del servidor: se reintenta
        }

        await new Promise((r) => setTimeout(r, 3000))
      }

      if (cancelled) return
      // No se pudo confirmar: se dice la verdad en vez de felicitar
      setConfirm({ state: 'unconfirmed' })
    }

    confirmPayment()
    return () => { cancelled = true }
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

  // La promo llega desde el backend adjunta a cada paquete
  const promo = packages.find((p) => p.promo)?.promo ?? null

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

      {/* Confirmación del pago al volver de MercadoPago */}
      <PaymentBanner state={confirm.state} />

      {/* Promo de inauguración */}
      {!loading && promo && <PromoBanner promo={promo} />}

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
        subtitle={
          promo
            ? `Sin compromiso · Válido 1 mes · −${promo.discountPct}% aplicado`
            : 'Sin compromiso · Válido 1 mes'
        }
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
        subtitle={
          promo
            ? 'Precios de inauguración · Ahorra más conforme compras más clases'
            : 'Ahorra más conforme compras más clases'
        }
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
        {promo && (
          <p className="text-label text-stone/60 text-[11px] text-center leading-relaxed mb-2">
            Promo de inauguración: −{promo.discountPct}% aplicado automáticamente al pagar.
            No acumulable con otras promociones.
            {promo.endsAt && (
              <>
                {' '}Vigente hasta el{' '}
                {new Date(promo.endsAt).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long',
                })}
                .
              </>
            )}
          </p>
        )}
        <p className="text-label text-stone/50 text-[11px] text-center leading-relaxed">
          Los paquetes son personales e intransferibles.{'\n'}
          Todos los precios incluyen IVA. · SODI Barre & Coffee
        </p>
      </div>
    </div>
  )
}
