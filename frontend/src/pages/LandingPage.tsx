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

        {/* Logo — scale entrance + perpetual float */}
        <img
          src="/LOGOSODI.png"
          alt="SODI Barre & Coffee"
          className="w-60 h-auto drop-shadow-sm"
          draggable={false}
          style={{ animation: 'landingScale 900ms cubic-bezier(0.22,1,0.36,1) 380ms both, logoFloat 6s ease-in-out 1400ms infinite' }}
        />

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
        <p
          className="text-stone text-[11px] tracking-[0.22em] uppercase font-body text-center"
          style={fadeUp(740)}
        >
          Comunidad · Movimiento · Estilo
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full mt-2" style={fadeUp(880)}>
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

        {/* Social media */}
        <div className="flex flex-col items-center gap-4 w-full mt-1" style={fadeUp(1080)}>
          <p className="text-stone text-[9px] tracking-[0.28em] uppercase font-body">Síguenos</p>
          <div className="flex items-center gap-5">

            {/* Instagram */}
            <a href="https://www.instagram.com/sodibarre" target="_blank" rel="noopener noreferrer" className="tap-target transition-transform duration-300 hover:scale-110 active:scale-95">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="ig-bg" cx="30%" cy="100%" r="130%">
                    <stop offset="0%"  stopColor="#FFDC80"/>
                    <stop offset="25%" stopColor="#F77737"/>
                    <stop offset="50%" stopColor="#E1306C"/>
                    <stop offset="75%" stopColor="#833AB4"/>
                    <stop offset="100%" stopColor="#405DE6"/>
                  </radialGradient>
                </defs>
                <rect width="36" height="36" rx="9" fill="url(#ig-bg)"/>
                <rect x="10" y="10" width="16" height="16" rx="4.5" stroke="white" strokeWidth="1.6" fill="none"/>
                <circle cx="18" cy="18" r="4" stroke="white" strokeWidth="1.6" fill="none"/>
                <circle cx="23" cy="13" r="1.1" fill="white"/>
              </svg>
            </a>

            {/* Facebook */}
            <a href="https://www.facebook.com/sodibarre" target="_blank" rel="noopener noreferrer" className="tap-target transition-transform duration-300 hover:scale-110 active:scale-95">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="9" fill="#1877F2"/>
                <path d="M19.6 28V19.6H22.2L22.6 16.6H19.6V14.7C19.6 13.8 19.8 13.2 21.1 13.2H22.7V10.5C22.1 10.4 21.3 10.4 20.4 10.4C18 10.4 16.4 11.9 16.4 14.4V16.6H13.8V19.6H16.4V28H19.6Z" fill="white"/>
              </svg>
            </a>

            {/* TikTok */}
            <a href="https://www.tiktok.com/@sodibarre" target="_blank" rel="noopener noreferrer" className="tap-target transition-transform duration-300 hover:scale-110 active:scale-95">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="9" fill="#010101"/>
                <path d="M24.1 14.1C23.1 14 22.2 13.5 21.5 12.7C20.8 11.9 20.4 10.9 20.4 9.8V9H17.6V22.1C17.6 22.7 17.4 23.3 17 23.7C16.6 24.1 16 24.4 15.4 24.4C14.1 24.4 13.1 23.4 13.1 22.1C13.1 20.8 14.1 19.8 15.4 19.8C15.6 19.8 15.9 19.8 16.1 19.9V17C15.8 17 15.6 16.9 15.4 16.9C12.5 16.9 10.2 19.2 10.2 22.1C10.2 25 12.5 27.3 15.4 27.3C18.3 27.3 20.6 25 20.6 22.1V15.6C21.7 16.4 23 16.8 24.4 16.8V14C24.3 14.1 24.2 14.1 24.1 14.1Z" fill="white"/>
                <path d="M23.4 13.5C23.8 13.8 24.3 14 24.8 14.1V14C24.3 13.9 23.8 13.7 23.4 13.5Z" fill="#69C9D0"/>
              </svg>
            </a>

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
