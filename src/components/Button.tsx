import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

type Variant = 'gold' | 'outline' | 'ghost' | 'red' | 'green'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  gold: [
    'relative overflow-hidden',
    'bg-gradient-to-br from-[#FFE135] via-[#c9a84c] to-[#e8a020]',
    'text-[#1a0a00] font-bold',
    'shadow-[0_4px_20px_rgba(255,225,53,0.5),0_0_0_2px_rgba(201,168,76,0.6)]',
    'hover:brightness-110 btn-shine',
  ].join(' '),
  outline: [
    'bg-black/30 text-[#FFE135]',
    'border-2 border-[rgba(255,225,53,0.5)]',
    'hover:bg-black/50 hover:border-[#FFE135]',
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
