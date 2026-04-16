import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
  rows?: number
}

export function Skeleton({ className, rows = 1 }: SkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={clsx('skeleton', className ?? 'h-4 w-full')} />
      ))}
    </div>
  )
}
