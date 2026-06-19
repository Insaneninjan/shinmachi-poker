import { cn } from '../utils/cn'
import type { CardMember } from '../types/game'

interface CardProps {
  card: CardMember
  size?: 'sm' | 'lg'
  selected?: boolean
  discarding?: boolean
  onClick?: () => void
  dealIndex?: number
}

export function Card({
  card,
  size = 'sm',
  selected = false,
  discarding = false,
  onClick,
  dealIndex = 0,
}: CardProps) {
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
          'relative w-full h-full rounded-[8px] overflow-hidden flex flex-col',
          // 金縁フレーム（TV番組風）
          selected
            ? 'shadow-[0_8px_24px_rgba(255,225,53,0.7),0_0_0_3px_#FFE135,0_0_0_5px_#c9a84c]'
            : discarding
            ? 'shadow-[0_8px_24px_rgba(220,50,50,0.7),0_0_0_3px_#e24b4a,0_0_0_5px_#8b1a1a]'
            : 'shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_0_2px_#c9a84c,0_0_0_4px_rgba(201,168,76,0.3)]',
        )}
        style={{
          background: 'linear-gradient(180deg, #fffef5 0%, #f5f0e0 100%)',
        }}
      >
        {/* 金縁装飾ライン（上） */}
        <div
          className="h-[3px] w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #c9a84c, #FFE135, #c9a84c)' }}
        />

        {/* 写真エリア（カードの大部分を占める） */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className={cn(
              'absolute inset-[3px] rounded-[4px] overflow-hidden',
              'flex items-center justify-center font-bold text-white',
              size === 'sm' ? 'text-[11px]' : 'text-[20px]',
            )}
            style={{ background: card.color }}
          >
            {card.photo ? (
              <img src={card.photo} alt={card.name} className="w-full h-full object-cover" />
            ) : (
              card.name.slice(0, 1)
            )}
          </div>
        </div>

        {/* 青いネームラベル（番組風） */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #1a3a9c 0%, #0d2060 100%)',
            padding: size === 'sm' ? '2px 2px' : '4px 4px',
            minHeight: size === 'sm' ? '18px' : '28px',
          }}
        >
          <span
            className={cn(
              'text-white font-bold leading-tight text-center w-full truncate',
              size === 'sm' ? 'text-[7px] px-1' : 'text-[10px] px-2',
            )}
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
          >
            {card.name}
          </span>
        </div>

        {/* 金縁装飾ライン（下） */}
        <div
          className="h-[3px] w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #c9a84c, #FFE135, #c9a84c)' }}
        />

        {/* 捨てる×マーク */}
        {discarding && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-600/40 rounded-[8px]">
            <span className="text-white text-2xl font-bold drop-shadow-lg">✕</span>
          </div>
        )}
      </div>
    </div>
  )
}
