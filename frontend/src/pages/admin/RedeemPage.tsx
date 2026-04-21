import { useState } from 'react'
import { QrCode, CheckCircle, XCircle, Search } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { TierBadge } from '../../components/TierBadge'
import type { TierId } from '../../types'

interface RewardLookup {
  id:         string
  type:       string
  isRedeemed: boolean
  redeemedAt: string | null
  createdAt:  string
  tierLabel:  string
  user: {
    id:                string
    name:              string
    email:             string
    totalClassesTaken: number
  }
  tier?: string
}

export default function RedeemPage() {
  const showToast = useStore((s) => s.showToast)

  const [code,     setCode]     = useState('')
  const [lookup,   setLookup]   = useState<RewardLookup | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemed,  setRedeemed]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSearch() {
    const trimmed = code.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setLookup(null)
    setRedeemed(false)

    try {
      const res = await adminApi.lookupReward(trimmed)
      setLookup(res.data as RewardLookup)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Código no encontrado')
    } finally {
      setLoading(false)
    }
  }

  async function handleRedeem() {
    if (!lookup) return
    setRedeeming(true)
    try {
      await adminApi.redeemReward(code.trim())
      setRedeemed(true)
      showToast('Premio canjeado correctamente', 'success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      showToast(msg ?? 'Error al canjear el premio', 'error')
    } finally {
      setRedeeming(false)
    }
  }

  const rewardLabel = lookup?.type === 'CAFE_FREE' ? '☕ Café gratis' : lookup?.type ?? ''

  return (
    <div className="min-h-screen bg-off-white">
      <header className="bg-white border-b border-nude-border px-6 py-5">
        <div className="flex items-center gap-3">
          <QrCode size={22} strokeWidth={1.5} className="text-nude-dark" />
          <div>
            <h1 className="text-title text-noir text-[20px]">Canjear premio</h1>
            <p className="text-stone text-[12px]">Ingresa el código QR de la alumna</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-sm mx-auto flex flex-col gap-6">

        {/* Code input */}
        <div className="bg-white border border-nude-border rounded-lg p-5 flex flex-col gap-3">
          <p className="text-stone text-[12px] font-body">
            Pide a la alumna que muestre su código QR y escanéalo, o escribe el código manualmente.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Código del premio…"
              value={code}
              onChange={(e) => { setCode(e.target.value); setLookup(null); setError(''); setRedeemed(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border border-nude-border rounded-sm px-4 py-3 text-label text-noir bg-white focus:outline-none focus:border-nude font-body text-[14px]"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !code.trim()}
              className="px-4 py-3 bg-noir text-white rounded-sm text-label tracking-wide disabled:opacity-50 transition-opacity"
            >
              {loading ? '…' : <Search size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <XCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-[13px] font-body">{error}</p>
          </div>
        )}

        {/* Already redeemed */}
        {redeemed && (
          <div className="flex flex-col items-center gap-3 px-4 py-6 bg-white border border-nude-border rounded-lg">
            <CheckCircle size={40} strokeWidth={1.5} className="text-green-500" />
            <p className="text-noir text-[16px] font-body font-medium text-center">¡Canjeado exitosamente!</p>
            <p className="text-stone text-[13px] font-body text-center">
              El premio de <strong>{lookup?.user.name}</strong> ha sido marcado como usado.
            </p>
            <button
              onClick={() => { setCode(''); setLookup(null); setRedeemed(false) }}
              className="mt-2 px-6 py-2.5 bg-noir text-white rounded-sm text-label tracking-wide"
            >
              Nuevo canje
            </button>
          </div>
        )}

        {/* Lookup result */}
        {lookup && !redeemed && (
          <div className="bg-white border border-nude-border rounded-lg overflow-hidden">
            {/* Status banner */}
            {lookup.isRedeemed ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-stone/10">
                <XCircle size={14} className="text-stone shrink-0" />
                <p className="text-stone text-[12px] font-body">Este código ya fue canjeado</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-nude-light">
                <CheckCircle size={14} className="text-nude-dark shrink-0" />
                <p className="text-nude-dark text-[12px] font-body font-medium">Código válido — listo para canjear</p>
              </div>
            )}

            <div className="p-5 flex flex-col gap-4">
              {/* Student info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-nude-light flex items-center justify-center shrink-0">
                  <span className="font-display text-nude-dark text-[18px]">
                    {lookup.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-noir font-body font-medium text-[15px]">{lookup.user.name}</p>
                  <p className="text-stone text-[12px]">{lookup.user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="px-3 py-2.5 bg-off-white rounded-md">
                  <p className="text-stone text-[10px] uppercase tracking-wide">Clases tomadas</p>
                  <p className="text-noir text-[20px] font-display font-light">{lookup.user.totalClassesTaken}</p>
                </div>
                <div className="px-3 py-2.5 bg-off-white rounded-md">
                  <p className="text-stone text-[10px] uppercase tracking-wide mb-1">Nivel</p>
                  <TierBadge tierId={(lookup.tier ?? 'none') as TierId} size="sm" />
                </div>
              </div>

              {/* Reward type */}
              <div className="px-4 py-3 bg-nude-light rounded-lg">
                <p className="text-stone text-[11px] font-body">Premio</p>
                <p className="text-noir text-[15px] font-body font-medium">{rewardLabel}</p>
              </div>

              {/* Redeem button */}
              {!lookup.isRedeemed && (
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full py-3.5 rounded-sm bg-noir text-white text-label tracking-wide transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {redeeming ? 'Canjeando…' : 'Confirmar canje'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
