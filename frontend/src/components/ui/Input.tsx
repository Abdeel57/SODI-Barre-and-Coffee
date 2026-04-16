import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-label text-stone">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full border border-nude-border rounded-sm px-4 py-3',
            'font-body text-[16px] text-noir placeholder:text-stone',
            'bg-white focus:outline-none focus:border-nude',
            'transition-colors duration-200',
            error && 'border-red-400 focus:border-red-400',
            className,
          )}
          {...props}
        />
        {error && <p className="text-label text-red-500 text-[11px]">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
