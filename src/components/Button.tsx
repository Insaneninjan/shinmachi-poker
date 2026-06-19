import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type Variant = 'gold' | 'outline' | 'ghost' | 'red' | 'green'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  gold: [
    'bg-gradient-to-b from-[#d4a93a] to-[#b8891e]',
    'text-[#1a0a00] font-bold',
    'shadow-[0_3px_0_#8a6010,0_4px_12px_rgba(0,0,0,0.35)]',
    'hover:from-[#ddb840] hover:to-[#c49820]',
    'active:shadow-[0_1px_0_#8a6010] active:translate-y-[2px]',
  ].join(' '),
  outline: [
    'bg-transparent text-[#c9a84c]',
    'border border-[rgba(201,168,76,0.5)]',
    'hover:bg-[rgba(201,168,76,0.08)] hover:border-[rgba(201,168,76,0.75)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-white/45',
    'border border-white/12',
    'text-[13px] py-[10px]',
    'hover:text-white/70 hover:border-white/22',
  ].join(' '),
  red: [
    'bg-gradient-to-b from-[#c0392b] to-[#96281b]',
    'text-white font-bold',
    'shadow-[0_3px_0_#6b1a10,0_4px_12px_rgba(0,0,0,0.35)]',
    'hover:brightness-105',
    'active:shadow-[0_1px_0_#6b1a10] active:translate-y-[2px]',
  ].join(' '),
  green: [
    'bg-gradient-to-b from-[#27ae60] to-[#1e8449]',
    'text-white font-bold',
    'shadow-[0_3px_0_#145c32,0_4px_12px_rgba(0,0,0,0.35)]',
    'hover:brightness-105',
    'active:shadow-[0_1px_0_#145c32] active:translate-y-[2px]',
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
        'flex items-center justify-center gap-2',
        'px-5 py-[13px] rounded-xl',
        'font-bold text-[15px] tracking-[0.04em]',
        'transition-all duration-150 cursor-pointer',
        'border-none font-[inherit]',
        'disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        fullWidth && 'w-full',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
