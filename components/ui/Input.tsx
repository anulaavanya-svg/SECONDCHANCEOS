'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const inputClasses =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-bg'

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, ...props },
  ref
) {
  const inputId = id ?? props.name
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className={inputClasses} {...props} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})

export default Input

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, className = '', id, ...props },
  ref
) {
  const inputId = id ?? props.name
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea ref={ref} id={inputId} className={`${inputClasses} min-h-[90px]`} {...props} />
    </div>
  )
})
