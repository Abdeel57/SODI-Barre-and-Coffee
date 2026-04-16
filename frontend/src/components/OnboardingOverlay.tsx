import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { X, Calendar, BookOpen, CreditCard, User, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import { profileApi } from '../api'

// ─── Types ────────────────────────────────────────────────────────────────────
type StepId =
  | 'welcome'
  | 'install-ios'
  | 'install-android'
  | 'nav-schedule'
  | 'nav-bookings'
  | 'nav-packages'
  | 'nav-profile'
  | 'done'

interface StepDef {
  id: StepId
  tutorialTarget?: string  // matches data-tutorial attribute on the target element
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── Platform detection ───────────────────────────────────────────────────────
function detectPlatform() {
  const ua = navigator.userAgent
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
  const isAndroid = /Android/.test(ua)
  return { isStandalone, isIOS, isAndroid }
}

function buildSteps(isStandalone: boolean, isIOS: boolean, isAndroid: boolean): StepDef[] {
  const steps: StepDef[] = [{ id: 'welcome' }]
  if (!isStandalone) {
    if (isIOS)          steps.push({ id: 'install-ios' })
    else if (isAndroid) steps.push({ id: 'install-android' })
  }
  steps.push(
    { id: 'nav-schedule', tutorialTarget: 'schedule' },
    { id: 'nav-bookings', tutorialTarget: 'bookings' },
    { id: 'nav-packages', tutorialTarget: 'packages' },
    { id: 'nav-profile',  tutorialTarget: 'profile'  },
    { id: 'done' },
  )
  return steps
}

// ─── Step content map ─────────────────────────────────────────────────────────
const NAV_STEP_CONTENT: Record<string, { icon: ReactNode; title: string; description: string }> = {
  'nav-schedule': {
    icon: <Calendar size={18} strokeWidth={1.5} className="text-nude-dark" />,
    title: 'Horario de clases',
    description:
      'Aquí ves todas las clases de la semana. Toca cualquier clase para reservar tu lugar — tu saldo se descuenta automáticamente.',
  },
  'nav-bookings': {
    icon: <BookOpen size={18} strokeWidth={1.5} className="text-nude-dark" />,
    title: 'Mis reservas',
    description:
      'Aquí aparecen todas tus clases confirmadas. Puedes cancelar una reserva antes de que empiece.',
  },
  'nav-packages': {
    icon: <CreditCard size={18} strokeWidth={1.5} className="text-nude-dark" />,
    title: 'Paquetes de clases',
    description:
      'Compra tu paquete aquí. Desde clases sueltas hasta paquetes mensuales ilimitados.',
  },
  'nav-profile': {
    icon: <User size={18} strokeWidth={1.5} className="text-nude-dark" />,
    title: 'Tu perfil',
    description:
      'Edita tu información y activa las notificaciones push para recibir recordatorios de tus clases.',
  },
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width:  i === current ? 16 : 6,
            height: 6,
            background: i === current ? '#0D0D0D' : '#E8E0D6',
          }}
        />
      ))}
    </div>
  )
}

// ─── iOS share icon ───────────────────────────────────────────────────────────
function IOSShareIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#F2EBE1" />
      <path d="M20 8v16M14 14l6-6 6 6" stroke="#7A5C3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="11" y="22" width="18" height="12" rx="2" stroke="#7A5C3A" strokeWidth="1.6" fill="none" />
    </svg>
  )
}

// ─── SVG Spotlight backdrop ───────────────────────────────────────────────────
function SpotlightBackdrop({ rect }: { rect: DOMRect | null }) {
  const W = window.innerWidth
  const H = window.innerHeight
  const pad = 10

  if (!rect) {
    return (
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(13,13,13,0.72)', zIndex: 59, pointerEvents: 'all' }}
      />
    )
  }

  const rx = Math.round(rect.left - pad)
  const ry = Math.round(rect.top - pad)
  const rw = Math.round(rect.width + pad * 2)
  const rh = Math.round(rect.height + pad * 2)

  return (
    <>
      <svg
        style={{ position: 'fixed', inset: 0, zIndex: 59, display: 'block', pointerEvents: 'all' }}
        width={W}
        height={H}
      >
        <defs>
          <mask id="sodi-tour-mask">
            <rect width={W} height={H} fill="white" />
            <rect x={rx} y={ry} width={rw} height={rh} rx={13} fill="black" />
          </mask>
        </defs>
        <rect width={W} height={H} fill="rgba(13,13,13,0.75)" mask="url(#sodi-tour-mask)" />
        {/* Amber highlight ring */}
        <rect
          x={rx - 1.5} y={ry - 1.5}
          width={rw + 3} height={rh + 3}
          rx={14.5}
          fill="none"
          stroke="rgba(201,168,130,0.8)"
          strokeWidth={1.5}
        />
      </svg>
      {/* Invisible tap blocker over the spotlight hole */}
      <div
        style={{
          position: 'fixed', left: rx, top: ry,
          width: rw, height: rh,
          borderRadius: 13, zIndex: 60, pointerEvents: 'all',
        }}
      />
    </>
  )
}

// ─── Tooltip card ─────────────────────────────────────────────────────────────
function TooltipCard({
  rect, stepId, stepIndex, totalSteps, isLast, onNext, onComplete, animKey,
}: {
  rect: DOMRect
  stepId: StepId
  stepIndex: number
  totalSteps: number
  isLast: boolean
  onNext: () => void
  onComplete: () => void
  animKey: number
}) {
  const content = NAV_STEP_CONTENT[stepId]
  if (!content) return null

  const TOOLTIP_W  = Math.min(296, window.innerWidth - 32)
  const centerX    = rect.left + rect.width / 2
  const left       = Math.max(16, Math.min(centerX - TOOLTIP_W / 2, window.innerWidth - TOOLTIP_W - 16))
  const arrowLeft  = Math.max(8, Math.min(centerX - left - 8, TOOLTIP_W - 24))
  const bottomPx   = window.innerHeight - rect.top + 14
  const progressPct = totalSteps > 1 ? (stepIndex / (totalSteps - 1)) * 100 : 100

  return (
    <div
      key={animKey}
      style={{
        position: 'fixed', bottom: bottomPx, left,
        width: TOOLTIP_W, zIndex: 62,
        animation: 'landingFadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-nude-border">
          <div
            className="h-full bg-nude transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="px-4 pt-3.5 pb-3 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-nude-light flex items-center justify-center shrink-0 mt-0.5">
              {content.icon}
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="font-display text-[16px] font-light text-noir leading-tight">
                {content.title}
              </h3>
              <p className="font-body text-[12px] text-stone leading-relaxed">
                {content.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onComplete}
              className="text-stone text-[11px] font-body hover:text-noir transition-colors py-1"
            >
              Omitir tutorial
            </button>
            <button
              onClick={onNext}
              className="px-4 py-2 bg-noir text-white text-[12px] rounded-sm tracking-wide transition-all active:scale-95"
            >
              {isLast ? '¡Empezar!' : 'Siguiente →'}
            </button>
          </div>
        </div>
      </div>

      {/* Downward arrow */}
      <div
        style={{
          position: 'absolute', bottom: -8, left: arrowLeft,
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid white',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
        }}
      />
    </div>
  )
}

// ─── Center card ──────────────────────────────────────────────────────────────
function CenterCard({
  step, userName, stepIndex, totalSteps, isLast,
  deferredPrompt, onInstallAndroid, onNext, onComplete, animKey, closing,
}: {
  step: StepId
  userName: string
  stepIndex: number
  totalSteps: number
  isLast: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  onInstallAndroid: () => void
  onNext: () => void
  onComplete: () => void
  animKey: number
  closing: boolean
}) {
  const firstName        = userName.split(' ')[0]
  const isAndroidInstall = step === 'install-android' && !!deferredPrompt
  const nextLabel =
    isLast               ? '¡Empezar!'        :
    step === 'install-ios' ? 'Ya la agregué →'  :
    'Siguiente →'

  return (
    <div
      className="fixed inset-0 z-[62] flex items-center justify-center px-5"
      style={{
        animation: closing
          ? 'landingFadeIn 0.25s ease-out reverse forwards'
          : 'landingFadeIn 0.3s ease-out both',
      }}
    >
      <div
        className="relative liquid-glass-strong rounded-2xl w-full max-w-sm overflow-hidden"
        style={{
          animation: closing
            ? 'landingScale 0.25s ease-in reverse forwards'
            : 'landingScale 0.35s cubic-bezier(0.22,1,0.36,1) 0.05s both',
        }}
      >
        <div className="bg-white/85 rounded-2xl p-6 flex flex-col gap-5">

          <div className="flex items-center justify-between">
            <ProgressDots total={totalSteps} current={stepIndex} />
            <button
              onClick={onComplete}
              className="w-7 h-7 flex items-center justify-center rounded-full text-stone hover:text-noir hover:bg-nude-light transition-colors"
              aria-label="Cerrar tutorial"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div key={animKey} style={{ animation: 'landingFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}>

            {step === 'welcome' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <img src="/LOGOSODI.png" alt="SODI" className="w-32 h-auto" draggable={false} />
                <div className="w-8 h-px bg-nude" />
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-[26px] font-light text-noir leading-tight">
                    ¡Bienvenida, {firstName}!
                  </h2>
                  <p className="text-stone text-[13px] leading-relaxed font-body">
                    Te guiaremos por las secciones principales para que aproveches al máximo SODI Barre.
                  </p>
                </div>
              </div>
            )}

            {step === 'install-ios' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <IOSShareIcon />
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-[22px] font-light text-noir leading-tight">
                    Agrega la app a tu inicio
                  </h2>
                  <p className="text-stone text-[13px] leading-relaxed font-body">
                    Para recibir notificaciones push necesitas agregar SODI a tu pantalla de inicio.
                  </p>
                </div>
                <div className="w-full flex flex-col gap-2 text-left">
                  {[
                    { n: 1, text: <>Toca el ícono <b className="text-noir">compartir</b> (□↑) en Safari</> },
                    { n: 2, text: <>Toca <b className="text-noir">"Agregar a pantalla de inicio"</b></> },
                    { n: 3, text: <>Confirma tocando <b className="text-noir">"Agregar"</b></> },
                  ].map(({ n, text }) => (
                    <div key={n} className="flex items-start gap-3 px-3 py-2 bg-nude-light rounded-md">
                      <span className="w-5 h-5 rounded-full bg-nude text-white text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                      <p className="text-[12px] text-stone leading-relaxed font-body">{text}</p>
                    </div>
                  ))}
                </div>
                <div className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-[11px] text-amber-700 font-body text-center leading-relaxed">
                    Sin esto las notificaciones push no funcionarán en iPhone
                  </p>
                </div>
              </div>
            )}

            {step === 'install-android' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-nude-light flex items-center justify-center">
                  <span className="text-xl">📲</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-[22px] font-light text-noir leading-tight">Instala la app</h2>
                  <p className="text-stone text-[13px] leading-relaxed font-body">
                    Para recibir notificaciones instala SODI Barre en tu teléfono.
                  </p>
                </div>
                {deferredPrompt ? (
                  <button onClick={onInstallAndroid} className="w-full py-3 rounded-sm bg-noir text-white text-label tracking-wide active:scale-95 transition-transform">
                    Instalar app
                  </button>
                ) : (
                  <div className="w-full flex flex-col gap-2 text-left">
                    {[
                      { n: 1, text: <>Toca el menú <b className="text-noir">⋮</b> en la esquina del navegador</> },
                      { n: 2, text: <>Toca <b className="text-noir">"Agregar a pantalla de inicio"</b></> },
                      { n: 3, text: <>Confirma tocando <b className="text-noir">"Agregar"</b></> },
                    ].map(({ n, text }) => (
                      <div key={n} className="flex items-start gap-3 px-3 py-2 bg-nude-light rounded-md">
                        <span className="w-5 h-5 rounded-full bg-nude text-white text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5">{n}</span>
                        <p className="text-[12px] text-stone leading-relaxed font-body">{text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-nude-light flex items-center justify-center">
                  <Check size={28} strokeWidth={2} className="text-nude-dark" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-[26px] font-light text-noir leading-tight">¡Todo listo!</h2>
                  <p className="text-stone text-[13px] leading-relaxed font-body">
                    Ya conoces lo esencial. ¡Nos vemos en clase!
                  </p>
                </div>
              </div>
            )}

          </div>

          <div
            key={`a-${animKey}`}
            className="flex flex-col gap-2"
            style={{ animation: 'landingFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 80ms both' }}
          >
            {!isAndroidInstall && (
              <button
                onClick={onNext}
                className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all active:scale-[0.98]"
              >
                {nextLabel}
              </button>
            )}
            {!isLast && (
              <button
                onClick={onComplete}
                className="w-full py-1.5 text-stone text-[12px] font-body transition-colors hover:text-noir"
              >
                Omitir tutorial
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export default function OnboardingOverlay() {
  const user                   = useStore((s) => s.user)
  const markOnboardingComplete = useStore((s) => s.markOnboardingComplete)

  const [stepIndex,      setStepIndex]      = useState(0)
  const [steps,          setSteps]          = useState<StepDef[]>([])
  const [animKey,        setAnimKey]        = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible,        setVisible]        = useState(false)
  const [closing,        setClosing]        = useState(false)
  const [spotlightRect,  setSpotlightRect]  = useState<DOMRect | null>(null)

  // Build step list once on mount
  useEffect(() => {
    const { isStandalone, isIOS, isAndroid } = detectPlatform()
    setSteps(buildSteps(isStandalone, isIOS, isAndroid))
  }, [])

  // Trigger: user is a new student (server flag = false), on any device
  useEffect(() => {
    if (user?.role !== 'STUDENT' || user?.onboardingCompleted !== false || steps.length === 0) return
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [user?.id, user?.onboardingCompleted, steps.length])

  // Capture Android install prompt
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Measure spotlight target when step changes
  // Retries once after 200ms to handle cases where BottomNav hasn't painted yet
  useEffect(() => {
    if (!visible || steps.length === 0) return
    const target = steps[stepIndex]?.tutorialTarget
    if (!target) { setSpotlightRect(null); return }

    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${target}"]`)
      if (el) {
        setSpotlightRect(el.getBoundingClientRect())
      } else {
        // Element not in DOM yet — retry after one paint cycle
        retryTimer = setTimeout(() => {
          const el2 = document.querySelector(`[data-tutorial="${target}"]`)
          if (el2) setSpotlightRect(el2.getBoundingClientRect())
        }, 200)
      }
    }

    measure()
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [stepIndex, steps, visible])

  const complete = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      // Persist to server (fire-and-forget), then update local store
      profileApi.completeOnboarding().catch(() => null)
      markOnboardingComplete()
      setVisible(false)
      setClosing(false)
    }, 260)
  }, [markOnboardingComplete])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) { complete(); return }
    setAnimKey((k) => k + 1)
    setStepIndex((i) => i + 1)
  }, [stepIndex, steps.length, complete])

  const handleInstallAndroid = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    next()
  }, [deferredPrompt, next])

  // Guard: only render when visible and user qualifies
  if (!visible || !user || user.role !== 'STUDENT' || user.onboardingCompleted !== false || steps.length === 0) {
    return null
  }

  const currentStep = steps[stepIndex]
  const isLast      = stepIndex === steps.length - 1
  const isSpotlight = !!currentStep.tutorialTarget

  return (
    <>
      <SpotlightBackdrop rect={isSpotlight ? spotlightRect : null} />

      {!isSpotlight && (
        <CenterCard
          step={currentStep.id}
          userName={user.name}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          isLast={isLast}
          deferredPrompt={deferredPrompt}
          onInstallAndroid={handleInstallAndroid}
          onNext={next}
          onComplete={complete}
          animKey={animKey}
          closing={closing}
        />
      )}

      {isSpotlight && spotlightRect && (
        <TooltipCard
          rect={spotlightRect}
          stepId={currentStep.id}
          stepIndex={stepIndex}
          totalSteps={steps.length}
          isLast={isLast}
          onNext={next}
          onComplete={complete}
          animKey={animKey}
        />
      )}
    </>
  )
}
