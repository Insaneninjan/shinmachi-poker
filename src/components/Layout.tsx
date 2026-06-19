import { ReactNode } from 'react'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen relative"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, #1e6b42 0%, #0e3d26 60%, #0a1628 100%)',
      }}
    >
      {/* フェルトテクスチャ */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 8px),
            repeating-linear-gradient(-45deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 8px)
          `,
        }}
      />
      <div className="relative max-w-[480px] mx-auto px-4 pb-20">
        {children}
      </div>
    </div>
  )
}

// ゴールドの仕切り線
export function GoldDivider() {
  return (
    <div
      className="h-px my-5"
      style={{
        background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
      }}
    />
  )
}

// セクションラベル
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#c9a84c] font-bold tracking-[0.15em] uppercase mb-3">
      <span
        className="flex-1 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))',
        }}
      />
      {children}
      <span
        className="flex-1 h-px"
        style={{
          background:
            'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)',
        }}
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
    <div className="bg-black/30 border border-[rgba(201,168,76,0.2)] rounded-[14px] p-5 mb-4">
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
      className="bg-black/40 border border-[#c9a84c] rounded-[16px] p-6 text-center mb-4"
      style={{ boxShadow: '0 0 30px rgba(201,168,76,0.15)' }}
    >
      <div className="text-[11px] text-[#c9a84c] font-bold tracking-[0.2em] mb-3">
        — ROOM CODE —
      </div>
      <div className="font-playfair text-[56px] text-[#fdf6e3] tracking-[14px]">
        {code}
      </div>
    </div>
  )
}

// バッジ
export function BadgeGold({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-[2px] rounded-md text-[11px] font-bold bg-[rgba(201,168,76,0.2)] text-[#c9a84c] border border-[rgba(201,168,76,0.3)]">
      {children}
    </span>
  )
}

export function BadgeGreen({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block px-2 py-[2px] rounded-md text-[11px] font-bold bg-[rgba(39,174,96,0.2)] text-[#4ade80] border border-[rgba(39,174,96,0.3)]">
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
    <div className="flex items-center gap-3 bg-black/35 border border-[rgba(201,168,76,0.3)] rounded-[12px] px-4 py-3 mb-4">
      <span
        className="w-[10px] h-[10px] rounded-full flex-shrink-0"
        style={{
          background: dotColor,
          boxShadow: `0 0 8px ${dotColor}`,
        }}
      />
      <span className="text-[13px] font-bold text-[#fdf6e3]">{name}</span>
      <span className="text-[11px] text-white/40 ml-auto">{desc}</span>
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
