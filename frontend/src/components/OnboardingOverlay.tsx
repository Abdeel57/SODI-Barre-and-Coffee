import { useState, useEffect, useCallback } from 'react'
import { X, Calendar, BookOpen, CreditCard, Bell, Check } from 'lucide-react'
import { useStore } from '../store/useStore'

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

// ─── Step definitions ─────────────────────────────────────────────────────────
type StepId = 'welcome' | 'install-ios' | 'install-android' | 'schedule' | 'bookings' | 'packages' | 'notifications' | 'done'

interface Step { id: StepId }

function buildSteps(isStandalone: boolean, isIOS: boolean, isAndroid: boolean): Step[] {
  const steps: Step[] = [{ id: 'welcome' }]
  if (!isStandalone) {
    if (isIOS)     steps.push({ id: 'install-ios' })
    else if (isAndroid) steps.push({ id: 'install-android' })
  }
  steps.push(
    { id: 'schedule' },
    { id: 'bookings' },
    { id: 'packages' },
    { id: 'notifications' },
    { id: 'done' },
  )
  return steps
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

// ─── iOS install illustration ─────────────────────────────────────────────────
function IOSShareIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#F2EBE1"/>
      <path d="M20 8v16M14 14l6-6 6 6" stroke="#7A5C3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="11" y="22" width="18" height="12" rx="2" stroke="#7A5C3A" strokeWidth="1.6" fill="none"/>
    </svg>
  )
}

// ─── Step content ─────────────────────────────────────────────────────────────
function StepContent({
  step,
  userName,
  deferredPrompt,
  onInstallClick,
}: {
  step: StepId
  userName: string
  deferredPrompt: BeforeInstallPromptEvent | null
  onInstallClick: () => void
}) {
  const firstName = userName.split(' ')[0]

  if (step === 'welcome') return (
    <div className="flex flex-col items-center gap-4 text-center">
      <img src="/LOGOSODI.png" alt="SODI" className="w-36 h-auto" draggable={false} />
      <div className="w-8 h-px bg-nude" />
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[28px] font-light text-noir leading-tight">
          ¡Bienvenida, {firstName}!
        </h2>
        <p className="text-stone text-[13px] leading-relaxed font-body">
          Hagamos un recorrido rápido para que saques el máximo de SODI Barre &amp; Coffee.
        </p>
      </div>
    </div>
  )

  if (step === 'install-ios') return (
    <div className="flex flex-col items-center gap-4 text-center">
      <IOSShareIcon />
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[24px] font-light text-noir leading-tight">
          Agrega la app a tu inicio
        </h2>
        <p className="text-stone text-[13px] leading-relaxed font-body">
          Para recibir notificaciones de tus clases necesitas agregar la app a tu pantalla de inicio.
        </p>
      </div>
      <div className="w-full flex flex-col gap-2 text-left">
        {[
          { n: 1, text: <>Toca el ícono <span className="font-medium text-noir">compartir</span> (□↑) en la barra del navegador</> },
          { n: 2, text: <>Desplázate y toca <span className="font-medium text-noir">"Agregar a pantalla de inicio"</span></> },
          { n: 3, text: <>Toca <span className="font-medium text-noir">"Agregar"</span> en la esquina superior derecha</> },
        ].map(({ n, text }) => (
          <div key={n} className="flex items-start gap-3 px-3 py-2.5 bg-nude-light rounded-md">
            <span className="w-5 h-5 rounded-full bg-nude text-white text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5">
              {n}
            </span>
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
  )

  if (step === 'install-android') return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-10 h-10 rounded-xl bg-nude-light flex items-center justify-center">
        <span className="text-nude-dark text-xl">📲</span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[24px] font-light text-noir leading-tight">
          Instala la app
        </h2>
        <p className="text-stone text-[13px] leading-relaxed font-body">
          Para una mejor experiencia y recibir notificaciones, instala SODI Barre en tu teléfono.
        </p>
      </div>
      {deferredPrompt ? (
        <button
          onClick={onInstallClick}
          className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all duration-200 active:scale-[0.98]"
        >
          Instalar app
        </button>
      ) : (
        <div className="w-full flex flex-col gap-2 text-left">
          {[
            { n: 1, text: <>Toca el menú <span className="font-medium text-noir">⋮</span> en la esquina superior derecha del navegador</> },
            { n: 2, text: <>Toca <span className="font-medium text-noir">"Agregar a pantalla de inicio"</span></> },
            { n: 3, text: <>Confirma tocando <span className="font-medium text-noir">"Agregar"</span></> },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3 px-3 py-2.5 bg-nude-light rounded-md">
              <span className="w-5 h-5 rounded-full bg-nude text-white text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              <p className="text-[12px] text-stone leading-relaxed font-body">{text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (step === 'schedule') return (
    <FeatureStep
      icon={<Calendar size={28} strokeWidth={1.5} className="text-nude-dark" />}
      title="Tu horario semanal"
      description="Ve todas las clases de la semana y reserva tu lugar con un solo toque. Tu saldo de clases se descuenta automáticamente."
    />
  )

  if (step === 'bookings') return (
    <FeatureStep
      icon={<BookOpen size={28} strokeWidth={1.5} className="text-nude-dark" />}
      title="Mis reservas"
      description="Aquí aparecen todas tus clases confirmadas. Puedes cancelar una reserva antes de que la clase empiece."
    />
  )

  if (step === 'packages') return (
    <FeatureStep
      icon={<CreditCard size={28} strokeWidth={1.5} className="text-nude-dark" />}
      title="Paquetes de clases"
      description="Compra tu paquete aquí. Tenemos opciones para todos los ritmos — desde clases sueltas hasta paquetes mensuales."
    />
  )

  if (step === 'notifications') return (
    <FeatureStep
      icon={<Bell size={28} strokeWidth={1.5} className="text-nude-dark" />}
      title="Activa las notificaciones"
      description="Ve a tu Perfil y toca 'Notificaciones' para activarlas. Te avisaremos de tus clases y novedades de SODI Barre."
    />
  )

  // done
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-nude-light flex items-center justify-center">
        <Check size={28} strokeWidth={2} className="text-nude-dark" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[28px] font-light text-noir leading-tight">
          ¡Todo listo!
        </h2>
        <p className="text-stone text-[13px] leading-relaxed font-body">
          Ya conoces lo esencial. Si tienes dudas escríbenos por nuestras redes sociales.
        </p>
      </div>
    </div>
  )
}

function FeatureStep({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-nude-light flex items-center justify-center">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[24px] font-light text-noir leading-tight">{title}</h2>
        <p className="text-stone text-[13px] leading-relaxed font-body">{description}</p>
      </div>
    </div>
  )
}

// ─── BeforeInstallPromptEvent type ────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export default function OnboardingOverlay() {
  const user                 = useStore((s) => s.user)
  const onboardingCompleted  = useStore((s) => s.onboardingCompleted)
  const setOnboardingCompleted = useStore((s) => s.setOnboardingCompleted)

  const [stepIndex,      setStepIndex]      = useState(0)
  const [steps,          setSteps]          = useState<Step[]>([])
  const [animKey,        setAnimKey]        = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible,        setVisible]        = useState(false)
  const [closing,        setClosing]        = useState(false)

  // Build steps once on mount
  useEffect(() => {
    const { isStandalone, isIOS, isAndroid } = detectPlatform()
    setSteps(buildSteps(isStandalone, isIOS, isAndroid))
  }, [])

  // Show overlay after a short delay so the page renders first (no jank)
  useEffect(() => {
    if (!user || user.role !== 'STUDENT' || onboardingCompleted || steps.length === 0) return
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [user, onboardingCompleted, steps])

  // Capture Android install prompt
  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const complete = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setOnboardingCompleted()
      setVisible(false)
      setClosing(false)
    }, 280)
  }, [setOnboardingCompleted])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      complete()
      return
    }
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

  if (!visible || !user || user.role !== 'STUDENT' || onboardingCompleted || steps.length === 0) {
    return null
  }

  const currentStep = steps[stepIndex]
  const isLast      = stepIndex === steps.length - 1
  const isInstallStep = currentStep.id === 'install-ios' || currentStep.id === 'install-android'
  const isAndroidInstall = currentStep.id === 'install-android' && !!deferredPrompt

  const nextLabel = isLast
    ? '¡Empezar!'
    : isInstallStep && !isAndroidInstall
    ? 'Ya la agregué →'
    : 'Siguiente →'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{
        animation: closing
          ? 'landingFadeIn 0.28s ease-out reverse forwards'
          : 'landingFadeIn 0.3s ease-out both',
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-noir/60 backdrop-blur-sm" />

      {/* Card — Liquid Glass */}
      <div
        className="relative liquid-glass-strong rounded-2xl w-full max-w-sm overflow-hidden"
        style={{
          animation: closing
            ? 'landingScale 0.28s ease-in reverse forwards'
            : `landingScale 0.35s cubic-bezier(0.22,1,0.36,1) 0.05s both`,
        }}
      >
        {/* Inner white surface for readability */}
        <div className="bg-white/80 rounded-2xl p-6 flex flex-col gap-5">

          {/* Top bar: dots + close */}
          <div className="flex items-center justify-between">
            <ProgressDots total={steps.length} current={stepIndex} />
            <button
              onClick={complete}
              className="w-7 h-7 flex items-center justify-center rounded-full text-stone hover:text-noir hover:bg-nude-light transition-colors tap-target"
              aria-label="Cerrar tutorial"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Step content — animated on change */}
          <div
            key={animKey}
            style={{ animation: 'landingFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both' }}
          >
            <StepContent
              step={currentStep.id}
              userName={user.name}
              deferredPrompt={deferredPrompt}
              onInstallClick={handleInstallAndroid}
            />
          </div>

          {/* Actions */}
          <div
            className="flex flex-col gap-2"
            key={`actions-${animKey}`}
            style={{ animation: 'landingFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) 80ms both' }}
          >
            {/* Hide primary button if Android install step has native button inside content */}
            {!isAndroidInstall && (
              <button
                onClick={next}
                className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all duration-200 active:scale-[0.98] tap-target"
              >
                {nextLabel}
              </button>
            )}

            {!isLast && (
              <button
                onClick={complete}
                className="w-full py-1.5 text-stone text-[12px] font-body tap-target transition-colors hover:text-noir"
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
