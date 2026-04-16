import { useState, useEffect } from 'react'
import { X, Download, Bell } from 'lucide-react'
import { useStore } from '../store/useStore'
import { BottomSheet } from './ui/BottomSheet'

// ─── Platform helpers ─────────────────────────────────────────────────────────
function getPlatform() {
  if (typeof window === 'undefined') return null
  const ua = navigator.userAgent
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
  const isAndroid = /Android/.test(ua)
  return { isStandalone, isIOS, isAndroid }
}

// Snooze key — banner disappears for 48h if the user closes it
const SNOOZE_KEY = 'sodi-install-snooze'

function isSnoozed(): boolean {
  const ts = localStorage.getItem(SNOOZE_KEY)
  if (!ts) return false
  return Date.now() - parseInt(ts) < 48 * 60 * 60 * 1000
}

function snooze() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now()))
}

// ─── iOS Share Icon ───────────────────────────────────────────────────────────
function IOSShareIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="10" fill="#F2EBE1" />
      <path d="M20 8v16M14 14l6-6 6 6" stroke="#7A5C3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="11" y="22" width="18" height="12" rx="2" stroke="#7A5C3A" strokeWidth="1.6" fill="none" />
    </svg>
  )
}

// ─── Install instructions sheet ───────────────────────────────────────────────
function InstallSheet({
  isOpen,
  onClose,
  platform,
}: {
  isOpen: boolean
  onClose: () => void
  platform: 'ios' | 'android'
}) {
  const steps =
    platform === 'ios'
      ? [
          { icon: '①', text: <>Toca el ícono <strong className="text-noir">compartir</strong> (□↑) en la barra de Safari</> },
          { icon: '②', text: <>Desplázate y toca <strong className="text-noir">"Agregar a pantalla de inicio"</strong></> },
          { icon: '③', text: <>Toca <strong className="text-noir">"Agregar"</strong> en la esquina superior derecha</> },
        ]
      : [
          { icon: '①', text: <>Toca el menú <strong className="text-noir">⋮</strong> en la esquina del navegador</> },
          { icon: '②', text: <>Toca <strong className="text-noir">"Agregar a pantalla de inicio"</strong> o <strong className="text-noir">"Instalar aplicación"</strong></> },
          { icon: '③', text: <>Confirma tocando <strong className="text-noir">"Agregar"</strong></> },
        ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Instala SODI Barre">
      <div className="flex flex-col gap-5">
        {/* Step 1 — Install */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Download size={16} strokeWidth={1.5} className="text-nude-dark shrink-0" />
            <p className="font-body text-[13px] font-medium text-noir">Paso 1 — Agrega la app a tu inicio</p>
          </div>

          {platform === 'ios' && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-nude-light rounded-lg">
              <IOSShareIcon />
              <p className="text-[11px] text-stone font-body leading-relaxed">
                El ícono de compartir está en la barra inferior de Safari
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {steps.map(({ icon, text }, i) => (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5 bg-off-white rounded-lg border border-nude-border">
                <span className="text-nude-dark font-body text-[13px] font-medium shrink-0 mt-0.5">{icon}</span>
                <p className="text-[13px] text-stone leading-relaxed font-body">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Critical: close this tab */}
        <div className="bg-noir rounded-xl px-4 py-4 flex flex-col gap-2">
          <p className="text-nude text-[11px] font-body tracking-widest uppercase">Importante</p>
          <p className="text-white text-[14px] font-body leading-relaxed">
            Una vez instalada, <strong>cierra {platform === 'ios' ? 'Safari' : 'el navegador'} completamente</strong> y abre SODI desde tu pantalla de inicio.
          </p>
          <p className="text-white/60 text-[12px] font-body leading-relaxed">
            Las notificaciones solo funcionan desde la app instalada, no desde el navegador.
          </p>
        </div>

        {/* Step 2 — Notifications */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Bell size={16} strokeWidth={1.5} className="text-nude-dark shrink-0" />
            <p className="font-body text-[13px] font-medium text-noir">Paso 2 — Activa las notificaciones</p>
          </div>
          <p className="text-[13px] text-stone font-body leading-relaxed px-1">
            Al abrir la app desde tu inicio, te pediremos permiso para enviarte recordatorios de tus clases con anticipación.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── Main banner ──────────────────────────────────────────────────────────────
export function InstallBanner() {
  const user = useStore((s) => s.user)
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null)
  const [snoozed,  setSnoozed]  = useState(true) // start hidden, check after mount
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    const p = getPlatform()
    if (!p || p.isStandalone) return  // already installed — never show
    if (isSnoozed()) return           // dismissed recently

    if (p.isIOS)          setPlatform('ios')
    else if (p.isAndroid) setPlatform('android')

    setSnoozed(false)
  }, [])

  // Only show for STUDENT role
  if (!user || user.role !== 'STUDENT') return null
  if (!platform || snoozed) return null

  function handleDismiss() {
    snooze()
    setSnoozed(true)
  }

  return (
    <>
      {/* Floating banner just above the BottomNav */}
      <div
        className="fixed inset-x-3 z-[31] rounded-xl overflow-hidden shadow-lg"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 10px)',
          animation: 'landingFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <button
          className="w-full text-left bg-noir px-4 py-3 flex items-center gap-3"
          onClick={() => setSheetOpen(true)}
        >
          <div className="w-8 h-8 rounded-lg bg-nude/20 flex items-center justify-center shrink-0">
            <Bell size={16} strokeWidth={1.5} className="text-nude" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-body font-medium leading-tight">
              Activa los recordatorios de tus clases
            </p>
            <p className="text-white/60 text-[11px] font-body mt-0.5">
              Instala la app y activa notificaciones →
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </button>
      </div>

      <InstallSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        platform={platform}
      />
    </>
  )
}
