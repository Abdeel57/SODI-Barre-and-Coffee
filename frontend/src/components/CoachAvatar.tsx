import { clsx } from 'clsx'

interface CoachAvatarProps {
  name: string
  avatar?: string | null
  /** Diámetro en px. */
  size?: number
  className?: string
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Foto de la coach; si no tiene, sus iniciales sobre el fondo nude. */
export function CoachAvatar({ name, avatar, size = 32, className = '' }: CoachAvatarProps) {
  return (
    <div
      className={clsx(
        'rounded-full bg-nude flex items-center justify-center shrink-0 overflow-hidden',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {avatar ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="text-label text-noir font-medium leading-none"
          style={{ fontSize: Math.max(9, Math.round(size * 0.36)) }}
        >
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}
