import type { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative"
      style={{
        background:
          'radial-gradient(ellipse at 50% 20%, #9b2020 0%, #6b0f0f 50%, #3d0808 100%)',
      }}
    >
      {/* 赤フェルトテクスチャ */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 6px),
            repeating-linear-gradient(-45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 6px)
          `,
        }}
      />
      {/* スポットライト（中央上から） */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,240,180,0.12) 0%, transparent 70%)',
        }}
      />
      {/* キラキラ装飾 */}
      <div className="fixed top-6 left-6 text-yellow-300 text-xl pointer-events-none animate-sparkle" style={{ animationDelay: '0s' }}>✦</div>
      <div className="fixed top-12 right-8 text-yellow-200 text-sm pointer-events-none animate-sparkle" style={{ animationDelay: '0.5s' }}>✦</div>
      <div className="fixed top-28 left-10 text-yellow-100 text-xs pointer-events-none animate-sparkle" style={{ animationDelay: '1s' }}>✦</div>
      <div className="relative max-w-[480px] mx-auto px-4 pb-20">
        {children}
      </div>
    </div>
  )
}

// ゴールドの仕切り線
export function GoldDivider() {
  return (
    <div className="flex items-center gap-2 my-5">
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #FFE135)' }} />
      <span className="text-[#FFE135] text-xs">✦</span>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #FFE135, transparent)' }} />
    </div>
  )
}

// セクションラベル
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#FFE135] font-bold tracking-[0.15em] uppercase mb-3">
      <span
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,225,53,0.5))' }}
      />
      {children}
      <span
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(255,225,53,0.5), transparent)' }}
      />
    </div>
  )
}

// ページタイトル
export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-playfair text-[26px] text-[#fdf6e3] mb-1 pt-4">
      {children}
    </h1>
  )
}

export function PageSub({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] text-white/45 mb-6 leading-relaxed">{children}</p>
  )
}

// パネル類
export function FormPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-black/50 border-2 border-[rgba(255,225,53,0.3)] rounded-[14px] p-5 mb-4"
      style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }}
    >
      {children}
    </div>
  )
}

export function InfoPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#e8cc80] mb-4 leading-relaxed">
      {children}
    </div>
  )
}

export function SuccessPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[rgba(26,92,56,0.4)] border border-[rgba(26,200,100,0.3)] rounded-[10px] px-4 py-3 text-[13px] text-[#7fe0a8] mb-4 leading-relaxed">
      {children}
    </div>
  )
}

export function WarningPanel({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.25)] rounded-[10px] px-4 py-3 text-[13px] text-white/60 mb-4 leading-relaxed">
      {children}
    </div>
  )
}

// ルームコード表示
export function RoomCodePanel({ code }: { code: string }) {
  return (
    <div
      className="rounded-[16px] p-6 text-center mb-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a0a0a 0%, #2d0d0d 100%)',
        border: '3px solid #FFE135',
        boxShadow: '0 0 30px rgba(255,225,53,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
      }}
    >
      <div className="text-[11px] text-[#FFE135] font-bold tracking-[0.2em] mb-3">
        — ROOM CODE —
      </div>
      <div className="font-playfair text-[56px] text-[#FFE135] tracking-[14px]"
        style={{ textShadow: '0 0 20px rgba(255,225,53,0.6)' }}
      >
        {code}
      </div>
    </div>
  )
}

// バッジ
export function BadgeGold({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-[2px] rounded-md text-[11px] font-bold text-[#1a0a00] border border-[#c9a84c]"
      style={{ background: 'linear-gradient(135deg, #FFE135, #c9a84c)' }}
    >
      {children}
    </span>
  )
}

export function BadgeGreen({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-[2px] rounded-md text-[11px] font-bold bg-[rgba(39,174,96,0.25)] text-[#4ade80] border border-[rgba(39,174,96,0.4)]">
      {children}
    </span>
  )
}

// フェーズバナー
interface PhaseBannerProps {
  phase: string
  name: string
  desc: string
}

const PHASE_DOT: Record<string, string> = {
  change: '#facc15',
  open: '#f97316',
  judge: '#a78bfa',
  winner: '#a78bfa',
}

export function PhaseBanner({ phase, name, desc }: PhaseBannerProps) {
  const dotColor = PHASE_DOT[phase] ?? '#facc15'
  return (
    <div
      className="flex items-center gap-3 rounded-[12px] px-4 py-3 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(30,10,10,0.7) 100%)',
        border: `2px solid ${dotColor}`,
        boxShadow: `0 0 12px ${dotColor}44`,
      }}
    >
      <span
        className="w-[10px] h-[10px] rounded-full flex-shrink-0"
        style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
      />
      <span className="text-[13px] font-bold text-white">{name}</span>
      <span className="text-[11px] text-white/50 ml-auto">{desc}</span>
    </div>
  )
}

// プログレスバー
interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="mb-2">
      <div className="bg-black/30 rounded-full overflow-hidden h-[6px]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #c9a84c, #e8cc80)',
          }}
        />
      </div>
      <div className="text-[12px] text-white/40 text-center mt-1">
        {current} / {total} 人完了
      </div>
    </div>
  )
}
