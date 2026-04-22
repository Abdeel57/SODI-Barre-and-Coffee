import type { TierId } from '../types'
import { getTierInfo } from '../types'
import { TIER_FRAME_CONFIG } from './tierFrameConfig'

interface TierFrameProps {
  tierId: TierId
  size?: number               // avatar circle diameter in px, default 72
  initial: string
  avatarUrl?: string | null
  iconUrl?: string
  className?: string
}

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
  const tier = getTierInfo(tierId)

  // ── No tier ──────────────────────────────────────────────────────────────────
  if (tierId === 'none') {
    return (
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center bg-nude-light border-2 border-nude ${className}`}
        style={{ width: size, height: size, flexShrink: 0 }}
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
    const EDITOR_REF = 160
    const cfg        = TIER_FRAME_CONFIG[tierId] ?? { scale: 1.1, offsetX: 0, offsetY: 0 }
    const ratio      = size / EDITOR_REF
    const frameSize  = Math.round(size * cfg.scale)
    const ox         = Math.round(cfg.offsetX * ratio)
    const oy         = Math.round(cfg.offsetY * ratio)

    // Container = frameSize so the PNG fits exactly with no overflow needed.
    // Avatar circle is centered within the container, then offset inversely
    // (if the wreath moves right, the photo moves left relative to the frame).
    const photoLeft = Math.round((frameSize - size) / 2) - ox
    const photoTop  = Math.round((frameSize - size) / 2) - oy

    return (
      <div
        className={className}
        style={{ position: 'relative', width: frameSize, height: frameSize, flexShrink: 0 }}
      >
        {/* Avatar circle — centered within the frame container */}
        <div
          style={{
            position:     'absolute',
            left:         photoLeft,
            top:          photoTop,
            width:        size,
            height:       size,
            borderRadius: '50%',
            overflow:     'hidden',
            background:   '#F2EBE1',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
          }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span className="font-display" style={{ fontSize: size * 0.38, color: tier.textColor }}>{initial}</span>
          }
        </div>

        {/* PNG frame — fills the container exactly, no overflow */}
        <img
          src={iconUrl}
          alt=""
          style={{
            position:      'absolute',
            inset:         0,
            width:         frameSize,
            height:        frameSize,
            objectFit:     'contain',
            zIndex:        1,
            pointerEvents: 'none',
          }}
        />
      </div>
    )
  }

  // ── SVG ring fallback ─────────────────────────────────────────────────────────
  const center = size / 2
  const radius = center - 3
  const svgPad = Math.round(size * 0.08)
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{ inset: svgPad, background: tierId === 'prima' ? '#0D0D0D' : '#F2EBE1' }}
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
