import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type Variant = 'gold' | 'outline' | 'ghost' | 'red' | 'green'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  gold: [
    'bg-gradient-to-br from-[#c9a84c] via-[#a07830] to-[#c9a84c]',
    'text-[#2a1a00] font-bold',
    'shadow-[0_4px_15px_rgba(201,168,76,0.4)]',
    'hover:brightness-110',
  ].join(' '),
  outline: [
    'bg-white/[0.06] text-white/85',
    'border border-[rgba(201,168,76,0.4)]',
    'hover:bg-white/[0.12]',
  ].join(' '),
  ghost: [
    'bg-transparent text-white/50',
    'border border-white/15',
    'text-[13px] py-[10px]',
    'hover:text-white/80',
  ].join(' '),
  red: [
    'bg-gradient-to-br from-[#c0392b] to-[#96281b]',
    'text-white font-bold',
    'shadow-[0_4px_15px_rgba(192,57,43,0.4)]',
    'hover:brightness-110',
  ].join(' '),
  green: [
    'bg-gradient-to-br from-[#27ae60] to-[#1e8449]',
    'text-white font-bold',
    'shadow-[0_4px_15px_rgba(39,174,96,0.4)]',
    'hover:brightness-110',
  ].join(' '),
}

export function Button({
  variant = 'gold',
  fullWidth = true,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        // ベース
        'flex items-center justify-center gap-2',
        'px-5 py-[14px] rounded-[10px]',
        'font-[700] text-[15px] tracking-[0.05em]',
        'transition-all duration-200 cursor-pointer',
        'border-none font-[inherit]',
        'active:scale-[0.97]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none',
        fullWidth && 'w-full',
        // バリアント
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
