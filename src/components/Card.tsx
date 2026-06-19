import { cn } from '../utils/cn'
import type { CardMember } from '../types/game'

interface CardProps {
  card: CardMember
  size?: 'sm' | 'lg'
  selected?: boolean
  discarding?: boolean
  onClick?: () => void
  dealIndex?: number  // アニメーション遅延用
}

const SUIT_COLOR: Record<string, string> = {
  '♥': '#c0392b',
  '♦': '#c0392b',
  '♠': '#1a1a2e',
  '♣': '#1a1a2e',
}

export function Card({
  card,
  size = 'sm',
  selected = false,
  discarding = false,
  onClick,
  dealIndex = 0,
}: CardProps) {
  const suit = card.suit ?? '♠'
  const suitColor = SUIT_COLOR[suit] ?? '#1a1a2e'
  const delay = `${dealIndex * 0.1}s`

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: delay }}
      className={cn(
        'aspect-[2/3] animate-deal-in',
        size === 'lg' && 'cursor-pointer transition-transform duration-200',
        selected && 'translate-y-[-10px]',
        discarding && 'translate-y-[-10px]',
        onClick && 'cursor-pointer',
      )}
    >
      <div
        className={cn(
          // カード本体
          'relative w-full h-full rounded-[10px] overflow-hidden',
          'bg-[#fffef8] border border-white/90',
          'flex flex-col items-center justify-center',
          size === 'sm' ? 'p-1' : 'p-2',
          // 影
          selected
            ? 'shadow-[0_8px_24px_rgba(201,168,76,0.5),0_0_0_2px_#c9a84c]'
            : discarding
            ? 'shadow-[0_8px_24px_rgba(192,57,43,0.6),0_0_0_2px_#e24b4a]'
            : 'shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
        )}
      >
        {/* 内枠線 */}
        <div className="absolute inset-[3px] border border-black/[0.08] rounded-[7px] pointer-events-none" />

        {/* 左上スート */}
        <span
          className="absolute top-[3px] left-[4px] text-[9px] opacity-25 leading-none"
          style={{ color: suitColor }}
        >
          {suit}
        </span>

        {/* 顔写真 or イニシャル */}
        <div
          className={cn(
            'rounded-full overflow-hidden flex items-center justify-center',
            'font-bold text-white flex-shrink-0 mb-1',
            size === 'sm'
              ? 'w-[85%] aspect-square text-[11px]'
              : 'w-[88%] aspect-square text-[22px]',
          )}
          style={{ background: card.color, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
        >
          {card.photo ? (
            <img src={card.photo} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            card.name.slice(0, 1)
          )}
        </div>

        {/* 名前 */}
        <div
          className={cn(
            'text-center font-bold leading-tight text-[#333]',
            size === 'sm' ? 'text-[7px]' : 'text-[9px]',
          )}
        >
          {card.name}
        </div>

        {/* 右下スート（回転） */}
        <span
          className="absolute bottom-[3px] right-[4px] text-[9px] opacity-25 leading-none rotate-180"
          style={{ color: suitColor }}
        >
          {suit}
        </span>

        {/* 捨てる×マーク */}
        {discarding && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-600/35 rounded-[10px]">
            <span className="text-white text-2xl font-bold">✕</span>
          </div>
        )}
      </div>
    </div>
  )
}
