import type { TierId } from '../types'
import { getTierInfo } from '../types'

interface TierFrameProps {
  tierId: TierId
  size?: number               // diameter in px, default 72
  initial: string             // letter shown when no avatarUrl
  avatarUrl?: string | null   // user's real photo (Base64 or URL)
  iconUrl?: string            // PNG tier frame rendered on top of the photo
  className?: string
}

// ─── How much larger the PNG frame renders vs the photo circle ────────────────
// Plié/Arabesque have thin rings → scale up so the ring clearly sits outside
// Attitude has a moderate wreath → slight scale
// Prima has a thick wreath → no scale needed, fills naturally
const FRAME_SCALE: Record<string, number> = {
  plie:      1.28,
  arabesque: 1.22,
  attitude:  1.14,
  prima:     1.06,
}

// ─── SVG dots for Arabesque (fallback without PNG) ───────────────────────────
function ArabesqueDots({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const dots = 12
  return (
    <>
      {Array.from({ length: dots }).map((_, i) => {
        const angle = (i / dots) * Math.PI * 2 - Math.PI / 2
        const x = cx + r * Math.cos(angle)
        const y = cy + r * Math.sin(angle)
        return <circle key={i} cx={x} cy={y} r={1.6} fill="#C9A882" opacity={0.8} />
      })}
    </>
  )
}

export function TierFrame({ tierId, size = 72, initial, avatarUrl, iconUrl, className = '' }: TierFrameProps) {
  const tier   = getTierInfo(tierId)
  const center = size / 2
  const radius = center - 3

  // ── No tier ───────────────────────────────────────────────────────────────────
  if (tierId === 'none') {
    return (
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center bg-nude-light border-2 border-nude ${className}`}
        style={{ width: size, height: size }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          : <span className="font-display text-nude-dark" style={{ fontSize: size * 0.38 }}>{initial}</span>
        }
      </div>
    )
  }

  // ── PNG frame mode ────────────────────────────────────────────────────────────
  if (iconUrl) {
    const scale      = FRAME_SCALE[tierId] ?? 1.1
    const frameSize  = size * scale
    const frameOffset = (frameSize - size) / 2   // how far frame extends beyond photo edge

    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        {/* Photo / initial fills the full circle */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: '#F2EBE1' }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <span className="font-display" style={{ fontSize: size * 0.38, color: tier.textColor }}>{initial}</span>
          }
        </div>

        {/* PNG frame — scaled up and centered so the ring wraps around the photo edge */}
        <img
          src={iconUrl}
          alt=""
          style={{
            position:    'absolute',
            width:       frameSize,
            height:      frameSize,
            top:         -frameOffset,
            left:        -frameOffset,
            objectFit:   'contain',
            zIndex:      1,
            pointerEvents: 'none',
          }}
        />
      </div>
    )
  }

  // ── SVG ring fallback (no PNG provided) ──────────────────────────────────────
  const svgPad = Math.round(size * 0.08)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          inset:      svgPad,
          background: tierId === 'prima' ? '#0D0D0D' : '#F2EBE1',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          : <span className="font-display" style={{ fontSize: (size - svgPad * 2) * 0.38, color: tier.textColor }}>{initial}</span>
        }
      </div>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      >
        {(tierId === 'attitude' || tierId === 'prima') && (
          <circle cx={center} cy={center} r={radius + 1} fill="none" stroke={tier.color} strokeWidth={6} opacity={0.18} />
        )}
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={tier.color}
          strokeWidth={tierId === 'prima' ? 3 : 2.5}
          strokeDasharray={tierId === 'plie' ? '5 3' : 'none'}
        />
        {tierId === 'arabesque' && <ArabesqueDots cx={center} cy={center} r={radius} />}
        {tierId === 'prima' && [0, 90, 180, 270].map((deg) => {
          const angle = (deg - 90) * (Math.PI / 180)
          return <circle key={deg}
            cx={center + radius * Math.cos(angle)}
            cy={center + radius * Math.sin(angle)}
            r={2.5} fill="#D4AF37" />
        })}
      </svg>
    </div>
  )
}
