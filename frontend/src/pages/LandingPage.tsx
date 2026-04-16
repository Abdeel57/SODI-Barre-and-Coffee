import { Link } from 'react-router-dom'

// ─── Cubic-bezier premium ease-out (iOS spring feel) ──────────────────────────
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp  = (delay: number, duration = 700) => ({
  animation: `landingFadeUp ${duration}ms ${EASE} ${delay}ms both`,
})
const fadeIn  = (delay: number, duration = 600) => ({
  animation: `landingFadeIn ${duration}ms ease-out ${delay}ms both`,
})
const scaleFade = (delay: number, duration = 900) => ({
  animation: `landingScale ${duration}ms ${EASE} ${delay}ms both`,
})
const lineExpand = (delay: number, duration = 800) => ({
  animation: `expandLine ${duration}ms ${EASE} ${delay}ms both`,
  transformOrigin: 'center',
})

// ─── Tiny particle component ──────────────────────────────────────────────────
function Particle({ x, delay, size }: { x: string; delay: number; size: number }) {
  return (
    <div
      className="absolute bottom-0 rounded-full bg-nude pointer-events-none"
      style={{
        left: x,
        width: size,
        height: size,
        animation: `particleRise ${2800 + delay}ms ease-in-out ${delay}ms infinite`,
        opacity: 0,
      }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-off-white overflow-hidden flex flex-col items-center justify-between select-none">

      {/* ── Ambient orbs ────────────────────────────────────────────────────── */}
      {/* Orb 1 — large warm glow, top-left */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: '-10%',
          left: '-20%',
          width: '70vw',
          height: '70vw',
          maxWidth: 480,
          maxHeight: 480,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,130,0.22) 0%, transparent 70%)',
          animation: `floatOrbA 18s ease-in-out infinite`,
          filter: 'blur(2px)',
        }}
      />
      {/* Orb 2 — medium warm glow, bottom-right */}
      <div
        className="pointer-events-none fixed"
        style={{
          bottom: '-8%',
          right: '-18%',
          width: '60vw',
          height: '60vw',
          maxWidth: 400,
          maxHeight: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,130,0.18) 0%, transparent 65%)',
          animation: `floatOrbB 22s ease-in-out infinite`,
          filter: 'blur(2px)',
        }}
      />
      {/* Orb 3 — small accent, top-right */}
      <div
        className="pointer-events-none fixed"
        style={{
          top: '30%',
          right: '-10%',
          width: '40vw',
          height: '40vw',
          maxWidth: 260,
          maxHeight: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,235,225,0.50) 0%, transparent 70%)',
          animation: `floatOrbC 15s ease-in-out infinite`,
          filter: 'blur(1px)',
        }}
      />

      {/* ── Rising particles ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <Particle x="15%"  delay={0}    size={2} />
        <Particle x="35%"  delay={900}  size={1.5} />
        <Particle x="58%"  delay={400}  size={2.5} />
        <Particle x="72%"  delay={1400} size={1.5} />
        <Particle x="85%"  delay={700}  size={2} />
        <Particle x="48%"  delay={2000} size={1} />
        <Particle x="22%"  delay={1700} size={1.5} />
      </div>

      {/* ── Top decorative line ──────────────────────────────────────────────── */}
      <div className="relative z-10 w-full flex justify-center pt-10 px-10" style={fadeIn(200, 1200)}>
        <div
          className="h-px bg-gradient-to-r from-transparent via-nude to-transparent w-full max-w-[220px]"
          style={lineExpand(300, 1000)}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-8 w-full max-w-xs">

        {/* Label */}
        <p
          className="text-stone text-[10px] tracking-[0.28em] font-body uppercase"
          style={fadeUp(250)}
        >
          Studio · México
        </p>

        {/* Logo */}
        <div style={scaleFade(380)}>
          <img
            src="/LOGOSODI.png"
            alt="SODI Barre & Coffee"
            className="w-60 h-auto drop-shadow-sm"
            draggable={false}
          />
        </div>

        {/* Divider with dots */}
        <div className="flex items-center gap-3 w-full justify-center" style={fadeIn(620, 700)}>
          <div
            className="h-px bg-nude flex-1 max-w-[60px]"
            style={lineExpand(640, 700)}
          />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-nude"
                style={{
                  ...fadeIn(700 + i * 80, 400),
                }}
              />
            ))}
          </div>
          <div
            className="h-px bg-nude flex-1 max-w-[60px]"
            style={lineExpand(640, 700)}
          />
        </div>

        {/* Tagline */}
        <div className="flex flex-col items-center gap-1.5" style={fadeUp(740)}>
          <p className="font-display text-[28px] font-light text-noir leading-snug tracking-wide text-center">
            Barre &amp; Coffee
          </p>
          <p className="text-stone text-[11px] tracking-[0.22em] uppercase font-body">
            Comunidad · Movimiento · Estilo
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full mt-2" style={fadeUp(920)}>
          <Link
            to="/login"
            className="w-full block text-center py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all duration-300 hover:bg-[#1a1a1a] active:scale-[0.98] tap-target"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="w-full block text-center py-3.5 rounded-sm border border-nude-border text-stone text-label tracking-wide transition-all duration-300 hover:border-nude hover:text-noir active:scale-[0.98] tap-target"
            style={fadeUp(1040)}
          >
            Crear cuenta
          </Link>
        </div>
      </div>

      {/* ── Bottom decorative line + footer ─────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-10 px-10 w-full">
        <div
          className="h-px bg-gradient-to-r from-transparent via-nude to-transparent w-full max-w-[220px]"
          style={lineExpand(1100, 1000)}
        />
        <p
          className="text-stone text-[10px] tracking-[0.28em] font-body uppercase"
          style={fadeIn(1200)}
        >
          SODI Barre &amp; Coffee
        </p>
      </div>

    </div>
  )
}
