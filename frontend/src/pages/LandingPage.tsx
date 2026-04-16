import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-between px-6 py-12 page-enter">
      {/* Ambient gradient */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 65% at 50% 35%, rgba(201,168,130,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Top spacer */}
      <div />

      {/* Center content */}
      <div className="relative w-full max-w-xs flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <img
            src="/LOGOSODI.png"
            alt="SODI Barre & Coffee"
            className="w-64 h-auto drop-shadow-sm"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-px bg-nude" />
            <p className="text-stone text-[13px] tracking-wider text-center font-body">
              BARRE · COFFEE · COMUNIDAD
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="w-full flex flex-col gap-3">
          <Link to="/login" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Iniciar sesión
            </Button>
          </Link>
          <Link to="/register" className="block">
            <Button variant="ghost" size="lg" className="w-full">
              Crear cuenta
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <p className="relative text-stone text-[11px] tracking-widest text-center font-body">
        SODI BARRE &amp; COFFEE
      </p>
    </div>
  )
}
