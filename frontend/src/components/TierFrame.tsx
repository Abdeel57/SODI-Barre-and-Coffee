import type { TierId } from '../types'
import { getTierInfo } from '../types'

interface TierFrameProps {
  tierId: TierId
  size?: number      // diameter in px, default 72
  initial: string    // letter inside avatar
  className?: string
}

// ─── Decorative dots for Arabesque ring ──────────────────────────────────────
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

export function TierFrame({ tierId, size = 72, initial, className = '' }: TierFrameProps) {
  const tier   = getTierInfo(tierId)
  const center = size / 2
  const pad    = 4
  const radius = center - pad

  if (tierId === 'none') {
    return (
      <div
        className={`rounded-full bg-nude-light border-2 border-nude flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="font-display text-nude-dark" style={{ fontSize: size * 0.38 }}>{initial}</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {/* Glow for Attitude and Prima */}
        {(tierId === 'attitude' || tierId === 'prima') && (
          <circle
            cx={center} cy={center} r={radius + 1}
            fill="none"
            stroke={tier.color}
            strokeWidth={6}
            opacity={0.18}
          />
        )}

        {/* Main ring */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={tier.color}
          strokeWidth={tierId === 'prima' ? 2.5 : 2}
          strokeDasharray={
            tierId === 'plie'      ? '4 4'  :
            tierId === 'arabesque' ? 'none' :
            'none'
          }
        />

        {/* Arabesque decorative dots */}
        {tierId === 'arabesque' && (
          <ArabesqueDots cx={center} cy={center} r={radius + 3} />
        )}

        {/* Prima gold accent dots at cardinal points */}
        {tierId === 'prima' && (
          <>
            {[0, 90, 180, 270].map((deg) => {
              const angle = (deg - 90) * (Math.PI / 180)
              const x = center + (radius) * Math.cos(angle)
              const y = center + (radius) * Math.sin(angle)
              return <circle key={deg} cx={x} cy={y} r={2.5} fill="#D4AF37" />
            })}
          </>
        )}
      </svg>

      {/* Avatar circle inside */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: pad,
          background: tierId === 'prima' ? '#0D0D0D' : '#F2EBE1',
        }}
      >
        <span
          className="font-display"
          style={{
            fontSize: (size - pad * 2) * 0.38,
            color: tier.textColor,
          }}
        >
          {initial}
        </span>
      </div>
    </div>
  )
}
