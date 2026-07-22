import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Gift, Check, Sparkles } from 'lucide-react'
import { promoApi } from '../api'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import type { PromoCampaign } from '../types'

export default function PromoClaimPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [campaign, setCampaign] = useState<PromoCampaign | null>(null)
  const [claimed,  setClaimed]  = useState(false)
  const [justNow,  setJustNow]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (authLoading) return

    promoApi
      .get(slug)
      .then((res) => {
        const data = res.data as { campaign: PromoCampaign; alreadyClaimed: boolean }
        setCampaign(data.campaign)
        setClaimed(data.alreadyClaimed)
      })
      .catch(() => setError('Esta promoción no existe o ya terminó'))
      .finally(() => setLoading(false))
  }, [slug, authLoading, user])

  async function handleClaim() {
    setClaiming(true)
    setError('')
    try {
      await promoApi.claim(slug)
      setClaimed(true)
      setJustNow(true)
    } catch (err) {
      const msg = (err as AxiosError<{ error: string }>).response?.data?.error
      setError(msg ?? 'No pudimos activar tu clase. Intenta de nuevo.')
      if (msg?.includes('Ya reclamaste')) setClaimed(true)
    } finally {
      setClaiming(false)
    }
  }

  const next = encodeURIComponent(`/promo/${slug}`)

  return (
    <div className="min-h-screen bg-off-white flex flex-col items-center justify-center px-6 pt-12 pb-nav page-enter">
      {/* Fondo */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 35%, rgba(201,168,130,0.18) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm flex flex-col items-center">
        <img src="/LOGOSODI.png" alt="SODI" className="w-24 h-auto mb-8 opacity-90" />

        {loading || authLoading ? (
          <div className="w-full flex flex-col items-center gap-4">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-3/4 rounded" />
            <Skeleton className="h-12 w-full rounded-md mt-4" />
          </div>
        ) : !campaign ? (
          <div className="text-center">
            <p className="font-display text-[26px] font-light text-noir">Promoción no disponible</p>
            <p className="text-label text-stone text-[13px] mt-2">{error}</p>
            <Link
              to="/"
              className="inline-block mt-6 px-6 py-3 bg-noir text-white rounded-md text-label tracking-wide"
            >
              Ir al inicio
            </Link>
          </div>
        ) : claimed ? (
          /* ── Ya tiene su clase ────────────────────────────────────────── */
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-noir flex items-center justify-center mb-6">
              <Check size={28} strokeWidth={1.5} className="text-nude" />
            </div>
            <p className="text-section text-nude-dark text-[10px] uppercase tracking-widest">
              {justNow ? 'Listo' : 'Ya la tienes'}
            </p>
            <h1 className="font-display text-[30px] font-light text-noir leading-tight mt-2">
              Tu clase de cortesía está activa
            </h1>
            <p className="text-label text-stone text-[13px] mt-3 leading-relaxed">
              Se aplica sola cuando reserves — no tienes que pagar nada ni mostrar ningún código.
            </p>

            <Button className="w-full mt-8" onClick={() => navigate('/schedule')}>
              Reservar mi clase
            </Button>
            <Link to="/packages" className="text-label text-stone text-[12px] mt-4 underline">
              Ver paquetes con 30% de descuento
            </Link>
          </div>
        ) : (
          /* ── Reclamo ──────────────────────────────────────────────────── */
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-nude-light flex items-center justify-center mb-6">
              <Gift size={26} strokeWidth={1.5} className="text-nude-dark" />
            </div>

            <p className="text-section text-nude-dark text-[10px] uppercase tracking-widest">
              {campaign.subhead}
            </p>
            <h1 className="font-display text-[32px] font-light text-noir leading-tight mt-2">
              {campaign.headline}
            </h1>
            <p className="text-label text-stone text-[13px] mt-3 leading-relaxed">
              {campaign.description}
            </p>

            {/* Detalle de la cortesía */}
            <div className="w-full mt-7 bg-white border border-nude-border rounded-2xl p-5 flex flex-col gap-3">
              {[
                '1 clase de barre completamente gratis',
                `Vigencia de ${campaign.validDays} días desde que la reclamas`,
                'Reservas desde la app, sin tarjeta',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-left">
                  <div className="w-4 h-4 rounded-full bg-nude-light flex items-center justify-center shrink-0">
                    <Check size={10} strokeWidth={2.5} className="text-nude-dark" />
                  </div>
                  <span className="font-body text-[13px] text-stone">{feat}</span>
                </div>
              ))}
            </div>

            {campaign.spotsLeft !== null && campaign.isOpen && (
              <p className="flex items-center gap-1.5 text-nude-dark text-[11px] font-body tracking-wide mt-4">
                <Sparkles size={11} />
                Quedan {campaign.spotsLeft} lugares
              </p>
            )}

            {error && <p className="text-red-500 text-[12px] font-body mt-4">{error}</p>}

            {!campaign.isOpen ? (
              <p className="text-label text-stone text-[13px] mt-7">
                Los lugares de esta promoción se agotaron. ¡Gracias por el cariño!
              </p>
            ) : user ? (
              <Button className="w-full mt-7" loading={claiming} onClick={handleClaim}>
                Reclamar mi clase gratis
              </Button>
            ) : (
              <div className="w-full mt-7 flex flex-col gap-3">
                <Button className="w-full" onClick={() => navigate(`/register?next=${next}`)}>
                  Crear cuenta y reclamar
                </Button>
                <Link
                  to={`/login?next=${next}`}
                  className="text-label text-stone text-[13px] underline"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
