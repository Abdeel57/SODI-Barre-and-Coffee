import type { TierId } from '../types'
import { getTierInfo } from '../types'

interface TierBadgeProps {
  tierId: TierId
  size?: 'sm' | 'md'
}

export function TierBadge({ tierId, size = 'sm' }: TierBadgeProps) {
  const tier = getTierInfo(tierId)
  if (tierId === 'none') return null

  const px  = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
  const txt = size === 'sm' ? 'text-[10px]' : 'text-[12px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-body font-medium ${px} ${txt}`}
      style={{ background: tier.bg, color: tier.textColor, border: `1px solid ${tier.color}40` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: tier.color }}
      />
      {tier.label}
    </span>
  )
}
