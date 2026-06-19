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
  const delay = `${dealIndex * 0.08}s`

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: delay }}
      className={cn(
        'aspect-[2/3] animate-deal-in',
        (size === 'lg' || onClick) && 'cursor-pointer transition-transform duration-150',
        selected && '-translate-y-2.5',
        discarding && '-translate-y-2.5',
      )}
    >
      <div
        className="relative w-full h-full rounded-lg overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(170deg, #fefcf0 0%, #f2ead8 100%)',
          // 状態によって影とボーダーを変える
          boxShadow: selected
            ? '0 6px 20px rgba(0,0,0,0.5), 0 0 0 2px #c9a84c'
            : discarding
            ? '0 6px 20px rgba(0,0,0,0.5), 0 0 0 2px #e24b4a'
            : '0 3px 10px rgba(0,0,0,0.5), 0 0 0 1.5px #c9a84c',
        }}
      >
        {/* 上部ゴールドライン */}
        <div
          className="h-[2.5px] w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #a07828, #c9a84c, #e0c870, #c9a84c, #a07828)' }}
        />

        {/* 写真エリア */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className={cn(
              'absolute inset-[2px] rounded-[3px] overflow-hidden',
              'flex items-center justify-center font-bold text-white',
              size === 'sm' ? 'text-[10px]' : 'text-[18px]',
            )}
            style={{ background: card.color }}
          >
            {card.photo
              ? <img src={card.photo} alt={card.name} className="w-full h-full object-cover" />
              : card.name.slice(0, 1)
            }
          </div>
        </div>

        {/* ネームラベル（番組テロップ風） */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(180deg, #1c3d9e 0%, #0f2268 100%)',
            minHeight: size === 'sm' ? '16px' : '26px',
            padding: size === 'sm' ? '1px 3px' : '3px 4px',
          }}
        >
          <span
            className={cn(
              'text-white font-bold leading-none text-center w-full truncate',
              size === 'sm' ? 'text-[6.5px]' : 'text-[9.5px]',
            )}
          >
            {card.name}
          </span>
        </div>

        {/* 下部ゴールドライン */}
        <div
          className="h-[2.5px] w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #a07828, #c9a84c, #e0c870, #c9a84c, #a07828)' }}
        />

        {/* 捨てる×オーバーレイ */}
        {discarding && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg"
            style={{ background: 'rgba(180,30,30,0.45)' }}>
            <span className="text-white font-bold drop-shadow" style={{ fontSize: size === 'sm' ? '18px' : '26px' }}>✕</span>
          </div>
        )}
      </div>
    </div>
  )
}
