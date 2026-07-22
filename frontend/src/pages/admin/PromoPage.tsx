import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Gift, Download, Copy, Check } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useStore } from '../../store/useStore'
import { Skeleton } from '../../components/ui/Skeleton'

interface PromoClaim {
  id:         string
  code:       string
  isRedeemed: boolean
  redeemedAt: string | null
  createdAt:  string
  user:       { id: string; name: string; email: string }
}

interface PromoData {
  url:       string
  slug:      string
  headline:  string
  isOpen:    boolean
  maxClaims: number | null
  claims:    number
  recent:    PromoClaim[]
}

/** Exporta el SVG del QR a PNG de alta resolución para imprimir. */
function downloadQrPng(svg: SVGSVGElement, filename: string, size = 1024) {
  const source = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
    }
    URL.revokeObjectURL(url)

    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = url
}

export default function AdminPromoPage() {
  const showToast = useStore((s) => s.showToast)
  const qrRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<PromoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    adminApi
      .getFreeClassPromo()
      .then((res) => setData(res.data as PromoData))
      .catch(() => showToast('Error al cargar la promoción', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  function handleCopy() {
    if (!data) return
    navigator.clipboard.writeText(data.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg || !data) return
    downloadQrPng(svg, `sodi-promo-${data.slug}.png`)
    showToast('QR descargado — listo para imprimir', 'success')
  }

  const redeemed = data?.recent.filter((r) => r.isRedeemed).length ?? 0

  return (
    <div className="min-h-screen bg-off-white">
      <header className="bg-white border-b border-nude-border px-6 py-5">
        <div className="flex items-center gap-3">
          <Gift size={22} strokeWidth={1.5} className="text-nude-dark" />
          <div>
            <h1 className="text-title text-noir text-[20px]">Promo QR — clase gratis</h1>
            <p className="text-stone text-[12px]">
              Imprime este código para el estudio, flyers o redes
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-3xl mx-auto flex flex-col gap-5">
        {loading || !data ? (
          <>
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </>
        ) : (
          <>
            {/* QR */}
            <div className="bg-white border border-nude-border rounded-lg p-6 flex flex-col items-center gap-5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${data.isOpen ? 'bg-green-500' : 'bg-stone'}`}
                />
                <p className="text-stone text-[11px] font-body uppercase tracking-widest">
                  {data.isOpen ? 'Campaña activa' : 'Campaña cerrada'}
                </p>
              </div>

              <div ref={qrRef} className="p-5 bg-white border-2 border-nude rounded-xl">
                <QRCodeSVG
                  value={data.url}
                  size={220}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0D0D0D"
                  marginSize={2}
                />
              </div>

              <p className="font-display text-[20px] font-light text-noir text-center leading-tight">
                {data.headline}
              </p>

              <div className="w-full max-w-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-off-white rounded-md">
                  <p className="flex-1 text-stone text-[11px] font-body truncate">{data.url}</p>
                  <button onClick={handleCopy} className="text-nude-dark shrink-0 tap-target">
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </button>
                </div>
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-noir text-white rounded-sm text-label tracking-wide transition-all active:scale-[0.98]"
                >
                  <Download size={15} />
                  Descargar PNG para imprimir
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-nude-border rounded-lg px-4 py-3">
                <p className="text-stone text-[10px] uppercase tracking-wide">Reclamadas</p>
                <p className="text-noir text-[24px] font-display font-light">
                  {data.claims}
                  {data.maxClaims !== null && (
                    <span className="text-stone text-[13px]"> / {data.maxClaims}</span>
                  )}
                </p>
              </div>
              <div className="bg-white border border-nude-border rounded-lg px-4 py-3">
                <p className="text-stone text-[10px] uppercase tracking-wide">Ya tomadas</p>
                <p className="text-noir text-[24px] font-display font-light">{redeemed}</p>
              </div>
              <div className="bg-white border border-nude-border rounded-lg px-4 py-3">
                <p className="text-stone text-[10px] uppercase tracking-wide">Disponibles</p>
                <p className="text-noir text-[24px] font-display font-light">
                  {data.maxClaims === null ? '∞' : Math.max(0, data.maxClaims - data.claims)}
                </p>
              </div>
            </div>

            {/* Últimos canjes */}
            <div className="bg-white border border-nude-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-nude-border">
                <p className="text-noir text-[13px] font-body font-medium">Últimas en reclamar</p>
              </div>

              {data.recent.length === 0 ? (
                <p className="text-stone text-[12px] font-body px-5 py-6 text-center">
                  Nadie ha reclamado la promo todavía.
                </p>
              ) : (
                data.recent.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-nude-border last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-nude-light flex items-center justify-center shrink-0">
                      <span className="font-display text-nude-dark text-[15px]">
                        {claim.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-noir text-[13px] font-body truncate">{claim.user.name}</p>
                      <p className="text-stone text-[11px] truncate">{claim.user.email}</p>
                    </div>
                    <span
                      className={`text-[10px] font-body uppercase tracking-widest shrink-0 ${
                        claim.isRedeemed ? 'text-stone' : 'text-nude-dark'
                      }`}
                    >
                      {claim.isRedeemed ? 'Usada' : 'Sin usar'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
